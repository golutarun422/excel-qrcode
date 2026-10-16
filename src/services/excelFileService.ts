import type { AccessMode, ExcelFileRecord, LocalFileHistoryItem } from '../types/excelFile';
import { buildFileAccessUrl } from './qrCodeService';
import { getStoredApiConfig } from './apiConfig';
import {
  saveDemoFile,
  getDemoFileRecord,
  getDemoFileBlob,
  deleteDemoFile,
} from './demoStorageService';

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
 * Find saved delete token for a file ID from local history
 */
export function getDeleteTokenForFile(fileId: string): string | undefined {
  const history = getLocalUploadHistory();
  const found = history.find((h) => h.id === fileId);
  return found?.deleteToken;
}

/**
 * Main Upload Function: Uploads file to Local Storage Backend (or Demo Storage if enabled)
 */
export async function uploadExcelWorkbook(
  file: File,
  options?: {
    accessMode?: AccessMode;
    expiresInHours?: number | null; // null = never
    signal?: AbortSignal;
  }
): Promise<ExcelFileRecord> {
  const config = getStoredApiConfig();

  // Demo Mode Handler
  if (config.isDemoMode || !config.apiUrl) {
    const fileId = crypto.randomUUID();
    let expiresAt: string | null = null;
    if (options?.expiresInHours && options.expiresInHours > 0) {
      const expDate = new Date();
      expDate.setHours(expDate.getHours() + options.expiresInHours);
      expiresAt = expDate.toISOString();
    }

    const demoRecord: ExcelFileRecord = {
      id: fileId,
      original_filename: file.name,
      storage_path: `files/${fileId}_${file.name}`,
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

  // Live Local Storage Backend Upload
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('accessMode', options?.accessMode || 'public');
  if (options?.expiresInHours) {
    formData.append('expiresInHours', String(options.expiresInHours));
  }

  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers['x-api-key'] = config.apiKey;
  }

  const uploadUrl = `${config.apiUrl}/api/files/upload`;

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
      signal: options?.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      const errorMsg = data?.error || `Upload failed with status ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const record = data.record as ExcelFileRecord;

    saveLocalHistoryItem({
      id: record.id,
      filename: record.original_filename,
      fileSize: record.file_size,
      uploadedAt: record.created_at,
      accessUrl: buildFileAccessUrl(record.id),
      accessMode: record.access_mode,
      expiresAt: record.expires_at,
      deleteToken: record.delete_token,
    });

    return record;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    const msg = err instanceof Error ? err.message : 'Upload failed';
    if (msg.includes('Failed to fetch')) {
      throw new Error(
        `Cannot reach the local storage backend at "${config.apiUrl}". Ensure your Windows laptop is powered on and running the backend and Cloudflare Tunnel.`
      );
    }
    throw new Error(msg);
  }
}

/**
 * Fetch file record by ID (checks Local Backend, fallback to Demo storage)
 */
export async function getExcelFileRecord(fileId: string): Promise<{
  record: ExcelFileRecord | null;
  errorStatus?: 'not_found' | 'expired' | 'inactive' | 'error';
  errorMessage?: string;
}> {
  const config = getStoredApiConfig();

  if (config.apiUrl) {
    try {
      const res = await fetch(`${config.apiUrl}/api/files/${fileId}`);
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.record) {
        return { record: data.record as ExcelFileRecord };
      }

      if (res.status === 410) {
        return {
          record: null,
          errorStatus: data?.errorStatus || 'inactive',
          errorMessage: data?.error || 'This spreadsheet is no longer accessible.',
        };
      }

      if (res.status === 404) {
        return {
          record: null,
          errorStatus: 'not_found',
          errorMessage: 'Spreadsheet not found. It may have been deleted or the link is incorrect.',
        };
      }
    } catch (err) {
      console.warn('Backend fetch failed, checking demo store:', err);
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
    errorMessage: 'Spreadsheet not found or storage backend is unreachable.',
  };
}

/**
 * Fetch Excel file blob from Local Backend or demo storage
 */
export async function fetchExcelFileBlob(record: ExcelFileRecord): Promise<Blob> {
  const config = getStoredApiConfig();
  let blob: Blob | null = null;

  if (config.apiUrl) {
    try {
      const res = await fetch(`${config.apiUrl}/api/files/${record.id}/raw`);
      if (res.ok) {
        blob = await res.blob();
      }
    } catch (err) {
      console.warn('Backend binary fetch error, checking local store:', err);
    }
  }

  // Fallback to demo storage
  if (!blob) {
    blob = await getDemoFileBlob(record.id);
  }

  if (!blob) {
    throw new Error('Workbook data could not be retrieved from local storage.');
  }

  return blob;
}

/**
 * Download original Excel file preserving original filename and content
 */
export async function downloadExcelFile(record: ExcelFileRecord): Promise<void> {
  const config = getStoredApiConfig();

  // If backend is configured, trigger direct download to increment download counter
  if (config.apiUrl) {
    try {
      const downloadUrl = `${config.apiUrl}/api/files/${record.id}/download`;
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = record.original_filename;
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return;
    } catch (err) {
      console.warn('Direct download link trigger failed, falling back to blob download:', err);
    }
  }

  // Blob fallback
  const blob = await fetchExcelFileBlob(record);
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
 * Delete file and disable its share link
 */
export async function deleteExcelFile(record: ExcelFileRecord): Promise<void> {
  const config = getStoredApiConfig();
  const deleteToken = record.delete_token || getDeleteTokenForFile(record.id);

  if (config.apiUrl) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (deleteToken) {
      headers['x-delete-token'] = deleteToken;
    }
    if (config.apiKey) {
      headers['x-api-key'] = config.apiKey;
    }

    try {
      const res = await fetch(`${config.apiUrl}/api/files/${record.id}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ delete_token: deleteToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok && res.status !== 404) {
        throw new Error(data?.error || 'Failed to delete file from backend');
      }
    } catch (err) {
      console.warn('Could not complete backend deletion:', err);
      // Still proceed with local history cleanup
    }
  }

  await deleteDemoFile(record.id);
  removeLocalHistoryItem(record.id);
}
