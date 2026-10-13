-- Migration: 20250101000000_create_excel_files.sql
-- Description: Create excel_files table, storage bucket, and RLS policies for Excel QR Generator

-- 1. Create the excel_files metadata table
CREATE TABLE IF NOT EXISTS public.excel_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    access_mode TEXT NOT NULL DEFAULT 'public' CHECK (access_mode IN ('public', 'private')),
    expires_at TIMESTAMPTZ NULL,
    download_count INTEGER NOT NULL DEFAULT 0
);

-- 2. Add performance & query indexes
CREATE INDEX IF NOT EXISTS idx_excel_files_created_at ON public.excel_files (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_excel_files_is_active ON public.excel_files (is_active);
CREATE INDEX IF NOT EXISTS idx_excel_files_expires_at ON public.excel_files (expires_at);

-- 3. Set up Storage Bucket (excel-files)
-- 50MB limit per file, restricted to spreadsheet MIME types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'excel-files',
    'excel-files',
    true,
    52428800, -- 50 MB
    ARRAY[
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/octet-stream'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. Enable Row Level Security (RLS) on excel_files
ALTER TABLE public.excel_files ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active, non-expired public files
CREATE POLICY "Allow public read active files"
    ON public.excel_files
    FOR SELECT
    USING (
        is_active = true 
        AND (expires_at IS NULL OR expires_at > now())
    );

-- Allow anonymous users to register uploaded file metadata
CREATE POLICY "Allow anonymous upload"
    ON public.excel_files
    FOR INSERT
    WITH CHECK (
        file_size <= 52428800
        AND original_filename IS NOT NULL
        AND storage_path IS NOT NULL
    );

-- Allow anonymous updates (for soft-deletion by file creator and download tracking)
CREATE POLICY "Allow public updates"
    ON public.excel_files
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 5. Storage policies for storage.objects
-- Allow public download of files in excel-files bucket
CREATE POLICY "Allow public download of excel files"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'excel-files');

-- Allow anonymous upload into excel-files bucket
CREATE POLICY "Allow anonymous upload to excel-files bucket"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'excel-files'
        AND (storage.foldername(name))[1] = 'spreadsheets'
    );

-- Allow deletion from excel-files bucket
CREATE POLICY "Allow deletion from excel-files bucket"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'excel-files');

-- 6. Helper function to safely increment download counter
CREATE OR REPLACE FUNCTION public.increment_download_count(target_file_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.excel_files
    SET download_count = download_count + 1
    WHERE id = target_file_id AND is_active = true;
END;
$$;
