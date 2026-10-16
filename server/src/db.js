import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { DATABASE_PATH } from './config.js';

let dbInstance = null;

export function getDatabase() {
  if (dbInstance) return dbInstance;

  const dbDir = path.dirname(DATABASE_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new DatabaseSync(DATABASE_PATH);

  // Enable WAL mode for better concurrency and performance
  dbInstance.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS excel_files (
      id TEXT PRIMARY KEY,
      original_filename TEXT NOT NULL,
      storage_filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      access_mode TEXT NOT NULL DEFAULT 'public',
      expires_at TEXT,
      download_count INTEGER NOT NULL DEFAULT 0,
      delete_token TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_excel_files_created_at ON excel_files (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_excel_files_is_active ON excel_files (is_active);
    CREATE INDEX IF NOT EXISTS idx_excel_files_expires_at ON excel_files (expires_at);
  `);

  return dbInstance;
}

export function insertFileRecord(record) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO excel_files (
      id, original_filename, storage_filename, storage_path,
      file_size, mime_type, created_at, is_active,
      access_mode, expires_at, download_count, delete_token
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  stmt.run(
    record.id,
    record.original_filename,
    record.storage_filename,
    record.storage_path,
    record.file_size,
    record.mime_type,
    record.created_at,
    record.is_active ? 1 : 0,
    record.access_mode,
    record.expires_at || null,
    record.download_count || 0,
    record.delete_token || null
  );

  return record;
}

export function getFileRecordById(id) {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM excel_files WHERE id = ?`);
  const row = stmt.get(id);
  if (!row) return null;

  return {
    ...row,
    is_active: Boolean(row.is_active),
    file_size: Number(row.file_size),
    download_count: Number(row.download_count)
  };
}

export function incrementDownloadCount(id) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE excel_files
    SET download_count = download_count + 1
    WHERE id = ? AND is_active = 1
  `);
  stmt.run(id);
}

export function deactivateFileRecord(id) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE excel_files
    SET is_active = 0
    WHERE id = ?
  `);
  stmt.run(id);
}

export function getFilesCount() {
  const db = getDatabase();
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM excel_files WHERE is_active = 1`);
  const row = stmt.get();
  return row ? row.count : 0;
}
