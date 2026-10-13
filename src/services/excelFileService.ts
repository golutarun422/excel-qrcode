import type { AccessMode, ExcelFileRecord, LocalFileHistoryItem } from '../types/excelFile';
import { buildFileAccessUrl } from './qrCodeService';
import { getSupabaseClient, getStoredSupabaseConfig } from './supabase';
import {
  saveDemoFile,
  getDemoFileRecord,
  getDemoFileBlob,
  deleteDemoFile,
} from './demoStorageService';

const BUCKET_NAME = 'excel-files';
const LOCAL_HISTORY_STORAGE_KEY = 'excel_qr_upload_history';

/**
 * Retrieve local browser upload history
 */
export function getLocalUploadHistory(): LocalFileHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse local upload history:', err);
    return [];
  }
}

/**
 * Save an item to local upload history
 */
export function saveLocalHistoryItem(item: LocalFileHistoryItem) {
  if (typeof window === 'undefined') return;
  try {
    const history = getLocalUploadHistory().filter((h) => h.id !== item.id);
    history.unshift(item); // Put latest on top
    localStorage.setItem(LOCAL_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save history item:', err);
  }
}

/**
 * Remove an item from local upload history
 */
export function removeLocalHistoryItem(fileId: string) {
  if (typeof window === 'undefined') return;
  try {
    const history = getLocalUploadHistory().filter((h) => h.id !== fileId);
    localStorage.setItem(LOCAL_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to remove history item:', err);
  }
}

/**
 * Sanitize filename to prevent directory traversal or bad storage characters
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Main Upload Function: Uploads file to Supabase Storage or Demo Storage
 */
export async function uploadExcelWorkbook(
  file: File,
  options?: {
    accessMode?: AccessMode;
    expiresInHours?: number | null; // null = never
    signal?: AbortSignal;
  }
): Promise<ExcelFileRecord> {
  const config = getStoredSupabaseConfig();
  const fileId = crypto.randomUUID();
  const safeName = sanitizeFilename(file.name);
  const storagePath = `spreadsheets/${fileId}/${safeName}`;

  let expiresAt: string | null = null;
  if (options?.expiresInHours && options.expiresInHours > 0) {
    const expDate = new Date();
    expDate.setHours(expDate.getHours() + options.expiresInHours);
    expiresAt = expDate.toISOString();
  }

  // Demo Mode Handler
  if (config.isDemoMode || !config.isRealSupabase) {
    const demoRecord: ExcelFileRecord = {
      id: fileId,
      original_filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      created_at: new Date().toISOString(),
      is_active: true,
      access_mode: options?.accessMode || 'public',
      expires_at: expiresAt,
      download_count: 0,
    };

    await saveDemoFile(demoRecord, file);

    saveLocalHistoryItem({
      id: demoRecord.id,
      filename: demoRecord.original_filename,
      fileSize: demoRecord.file_size,
      uploadedAt: demoRecord.created_at,
      accessUrl: buildFileAccessUrl(demoRecord.id),
      accessMode: demoRecord.access_mode,
      expiresAt: demoRecord.expires_at,
    });

    return demoRecord;
  }

  // Live Supabase Handler
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is not available. Please verify your credentials or enable Demo Mode.');
  }

  // Upload binary to Supabase Storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

  if (storageError) {
    if (storageError.message.includes('Failed to fetch')) {
      throw new Error(
        `Storage upload failed: "Failed to fetch". This usually means your Supabase project URL is unreachable, or the storage bucket "${BUCKET_NAME}" does not exist. Click "Setup Supabase" to test connection or run the SQL setup script.`
      );
    }
    throw new Error(`Storage upload failed: ${storageError.message}`);
  }

  // Save metadata in PostgreSQL
  const recordToInsert = {
    id: fileId,
    original_filename: file.name,
    storage_path: storagePath,
    file_size: file.size,
    mime_type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    is_active: true,
    access_mode: options?.accessMode || 'public',
    expires_at: expiresAt,
    download_count: 0,
  };

  const { data: insertedData, error: dbError } = await supabase
    .from('excel_files')
    .insert([recordToInsert])
    .select()
    .single();

  if (dbError) {
    try {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    } catch (cleanupErr) {
      console.error('Failed to cleanup storage file:', cleanupErr);
    }
    throw new Error(`Database error: ${dbError.message}. Did you run the SQL migration?`);
  }

  const record = insertedData as ExcelFileRecord;

  saveLocalHistoryItem({
    id: record.id,
    filename: record.original_filename,
    fileSize: record.file_size,
    uploadedAt: record.created_at,
    accessUrl: buildFileAccessUrl(record.id),
    accessMode: record.access_mode,
    expiresAt: record.expires_at,
  });

  return record;
}

/**
 * Fetch file record by ID (checks Supabase, fallback to Demo storage)
 */
export async function getExcelFileRecord(fileId: string): Promise<{
  record: ExcelFileRecord | null;
  errorStatus?: 'not_found' | 'expired' | 'inactive' | 'error';
  errorMessage?: string;
}> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('excel_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (!error && data) {
        const record = data as ExcelFileRecord;
        if (!record.is_active) {
          return {
            record: null,
            errorStatus: 'inactive',
            errorMessage: 'This spreadsheet has been disabled or deleted by its owner.',
          };
        }
        if (record.expires_at && new Date(record.expires_at) < new Date()) {
          return {
            record: null,
            errorStatus: 'expired',
            errorMessage: 'This shared Excel link has expired and is no longer accessible.',
          };
        }
        return { record };
      }
    } catch (err) {
      console.warn('Supabase fetch failed, trying local fallback:', err);
    }
  }

  // Fallback to demo storage
  const demoRecord = await getDemoFileRecord(fileId);
  if (demoRecord) {
    if (!demoRecord.is_active) {
      return {
        record: null,
        errorStatus: 'inactive',
        errorMessage: 'This spreadsheet has been disabled or deleted.',
      };
    }
    if (demoRecord.expires_at && new Date(demoRecord.expires_at) < new Date()) {
      return {
        record: null,
        errorStatus: 'expired',
        errorMessage: 'This shared Excel link has expired.',
      };
    }
    return { record: demoRecord };
  }

  return {
    record: null,
    errorStatus: 'not_found',
    errorMessage: 'Spreadsheet not found. It may have been deleted or the link is incorrect.',
  };
}

/**
 * Fetch Excel file blob from Supabase Storage or demo storage
 */
export async function fetchExcelFileBlob(record: ExcelFileRecord): Promise<Blob> {
  const supabase = getSupabaseClient();
  let blob: Blob | null = null;

  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(record.storage_path);
      if (!error && data) {
        blob = data;
      }
    } catch (err) {
      console.warn('Supabase download error, checking local store:', err);
    }
  }

  // If not found in Supabase or in demo mode, try local blob
  if (!blob) {
    blob = await getDemoFileBlob(record.id);
  }

  if (!blob) {
    throw new Error('Workbook data could not be retrieved from storage.');
  }

  return blob;
}

/**
 * Download original Excel file preserving original filename and content
 */
export async function downloadExcelFile(record: ExcelFileRecord): Promise<void> {
  const blob = await fetchExcelFileBlob(record);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      supabase.rpc('increment_download_count', { target_file_id: record.id }).then();
    } catch (err) {
      console.warn('Could not increment download count:', err);
    }
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = record.original_filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);
}

/**
 * Delete file
 */
export async function deleteExcelFile(record: ExcelFileRecord): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.storage.from(BUCKET_NAME).remove([record.storage_path]);
    await supabase.from('excel_files').update({ is_active: false }).eq('id', record.id);
  }

  await deleteDemoFile(record.id);
  removeLocalHistoryItem(record.id);
}
