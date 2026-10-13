export type AccessMode = 'public' | 'private';

export interface ExcelFileRecord {
  id: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  is_active: boolean;
  access_mode: AccessMode;
  expires_at: string | null;
  download_count: number;
}

export interface UploadProgressState {
  isUploading: boolean;
  progressPercent: number;
  statusMessage: string;
  error: string | null;
  uploadedRecord: ExcelFileRecord | null;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    filename: string;
    size: number;
    extension: string;
    mimeType: string;
    isMagicBytesValid: boolean;
  };
}

export interface QRGenerationOptions {
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

export interface LocalFileHistoryItem {
  id: string;
  filename: string;
  fileSize: number;
  uploadedAt: string;
  accessUrl: string;
  accessMode: AccessMode;
  expiresAt: string | null;
}
