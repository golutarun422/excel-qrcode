import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env from server directory if it exists
dotenv.config();

// Default storage directory on Windows laptop as requested: C:\ExcelQRStorage\files
const defaultStorageDir = process.env.STORAGE_DIR || path.join('C:', 'ExcelQRStorage', 'files');
const defaultDbPath = process.env.DATABASE_PATH || path.join('C:', 'ExcelQRStorage', 'excel_qr.db');

export const PORT = parseInt(process.env.PORT || '3001', 10);
export const HOST = process.env.HOST || '0.0.0.0';
export const STORAGE_DIR = path.resolve(defaultStorageDir);
export const DATABASE_PATH = path.resolve(defaultDbPath);
export const MAX_FILE_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_BYTES || String(50 * 1024 * 1024), 10); // 50MB
export const ADMIN_API_KEY = process.env.ADMIN_API_KEY || ''; // Optional protection for upload/delete

/**
 * Ensures storage directories and database parent folders exist
 */
export function ensureStorageDirectories() {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    const dbDir = path.dirname(DATABASE_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    console.log(`[Storage] Dedicated storage directory ready at: ${STORAGE_DIR}`);
    console.log(`[Database] SQLite database location: ${DATABASE_PATH}`);
  } catch (err) {
    console.warn(`[Storage Warning] Could not initialize directory at default location (${STORAGE_DIR}):`, err.message);
    // Fallback to local project directory if C: drive access is restricted
    const fallbackBase = path.resolve('./storage_data');
    const fallbackStorageDir = path.join(fallbackBase, 'files');
    const fallbackDbPath = path.join(fallbackBase, 'excel_qr.db');
    
    fs.mkdirSync(fallbackStorageDir, { recursive: true });
    console.log(`[Storage Fallback] Using local storage directory: ${fallbackStorageDir}`);
    return {
      storageDir: fallbackStorageDir,
      databasePath: fallbackDbPath
    };
  }

  return {
    storageDir: STORAGE_DIR,
    databasePath: DATABASE_PATH
  };
}
