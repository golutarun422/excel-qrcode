import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { STORAGE_DIR, MAX_FILE_SIZE_BYTES, ADMIN_API_KEY } from '../config.js';
import {
  insertFileRecord,
  getFileRecordById,
  incrementDownloadCount,
  deactivateFileRecord
} from '../db.js';
import {
  isValidUUID,
  sanitizeFilename,
  isSafePath,
  checkExcelMagicBytes,
  uploadRateLimiter,
  requireAdminOrOptionalAuth
} from '../security.js';

const router = express.Router();

// Configure multer for in-memory upload buffering before validation & writing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  }
});

/**
 * POST /api/files/upload
 * Securely uploads an Excel workbook to local storage and creates SQLite record
 */
router.post('/upload', uploadRateLimiter, requireAdminOrOptionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file was provided in the upload request.' });
    }

    const originalName = req.file.originalname || 'workbook.xlsx';
    const ext = path.extname(originalName).toLowerCase();

    // 1. Validate file extension
    if (!['.xlsx', '.xls'].includes(ext)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file extension "${ext}". Only genuine .xlsx and .xls Excel files are accepted.`
      });
    }

    // 2. Validate non-empty file
    if (req.file.size <= 0) {
      return res.status(400).json({ success: false, error: 'Uploaded file is empty (0 bytes).' });
    }

    // 3. Validate magic bytes
    const isValidSignature = checkExcelMagicBytes(req.file.buffer);
    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file signature: Content does not match valid Excel file format.'
      });
    }

    // 4. Generate unique IDs and safe storage path
    const fileId = crypto.randomUUID();
    const safeName = sanitizeFilename(originalName);
    const storageFilename = `${fileId}_${safeName}`;
    const storagePath = path.join(STORAGE_DIR, storageFilename);

    // Ensure storage path is strictly inside STORAGE_DIR
    if (!isSafePath(STORAGE_DIR, storagePath)) {
      return res.status(400).json({ success: false, error: 'Unsafe filename detected.' });
    }

    // 5. Write exact original workbook bytes to local storage directory
    await fs.promises.writeFile(storagePath, req.file.buffer);

    // 6. Calculate expiration date if requested
    let expiresAt = null;
    const expiresInHours = req.body.expiresInHours ? parseInt(req.body.expiresInHours, 10) : null;
    if (expiresInHours && expiresInHours > 0) {
      const expDate = new Date();
      expDate.setHours(expDate.getHours() + expiresInHours);
      expiresAt = expDate.toISOString();
    }

    const accessMode = req.body.accessMode === 'private' ? 'private' : 'public';
    const deleteToken = crypto.randomUUID();

    const mimeType =
      ext === '.xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.ms-excel';

    const record = {
      id: fileId,
      original_filename: originalName,
      storage_filename: storageFilename,
      storage_path: storageFilename, // relative storage reference
      file_size: req.file.size,
      mime_type: req.file.mimetype || mimeType,
      created_at: new Date().toISOString(),
      is_active: true,
      access_mode: accessMode,
      expires_at: expiresAt,
      download_count: 0,
      delete_token: deleteToken
    };

    insertFileRecord(record);

    return res.status(201).json({
      success: true,
      record: {
        id: record.id,
        original_filename: record.original_filename,
        storage_path: record.storage_path,
        file_size: record.file_size,
        mime_type: record.mime_type,
        created_at: record.created_at,
        is_active: record.is_active,
        access_mode: record.access_mode,
        expires_at: record.expires_at,
        download_count: record.download_count,
        delete_token: record.delete_token
      }
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while saving the spreadsheet.'
    });
  }
});

/**
 * GET /api/files/:id
 * Retrieve file metadata and verify active/expired status
 */
router.get('/:id', (req, res) => {
  const fileId = req.params.id;

  if (!isValidUUID(fileId)) {
    return res.status(400).json({
      success: false,
      errorStatus: 'not_found',
      error: 'Invalid file ID format.'
    });
  }

  const record = getFileRecordById(fileId);

  if (!record) {
    return res.status(404).json({
      success: false,
      errorStatus: 'not_found',
      error: 'Spreadsheet not found. It may have been deleted or the link is incorrect.'
    });
  }

  if (!record.is_active) {
    return res.status(410).json({
      success: false,
      errorStatus: 'inactive',
      error: 'This spreadsheet has been disabled or deleted by its owner.'
    });
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return res.status(410).json({
      success: false,
      errorStatus: 'expired',
      error: 'This shared Excel link has expired and is no longer accessible.'
    });
  }

  // Return sanitized record (omitting private delete_token)
  return res.json({
    success: true,
    record: {
      id: record.id,
      original_filename: record.original_filename,
      storage_path: record.storage_path,
      file_size: record.file_size,
      mime_type: record.mime_type,
      created_at: record.created_at,
      is_active: record.is_active,
      access_mode: record.access_mode,
      expires_at: record.expires_at,
      download_count: record.download_count
    }
  });
});

/**
 * GET /api/files/:id/raw
 * Serves the raw binary Excel bytes for in-browser client parsing (used by fetchExcelFileBlob)
 */
router.get('/:id/raw', async (req, res) => {
  const fileId = req.params.id;

  if (!isValidUUID(fileId)) {
    return res.status(400).json({ success: false, error: 'Invalid file ID.' });
  }

  const record = getFileRecordById(fileId);
  if (!record || !record.is_active) {
    return res.status(404).json({ success: false, error: 'Spreadsheet unavailable.' });
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return res.status(410).json({ success: false, error: 'Spreadsheet link expired.' });
  }

  const fullPath = path.join(STORAGE_DIR, record.storage_filename);
  if (!isSafePath(STORAGE_DIR, fullPath) || !fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, error: 'Workbook binary file missing from storage.' });
  }

  res.setHeader('Content-Type', record.mime_type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  const stream = fs.createReadStream(fullPath);
  stream.pipe(res);
});

/**
 * GET /api/files/:id/download
 * Download the exact original Excel file, incrementing download count
 */
router.get('/:id/download', async (req, res) => {
  const fileId = req.params.id;

  if (!isValidUUID(fileId)) {
    return res.status(400).json({ success: false, error: 'Invalid file ID.' });
  }

  const record = getFileRecordById(fileId);
  if (!record || !record.is_active) {
    return res.status(404).json({ success: false, error: 'Spreadsheet unavailable.' });
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return res.status(410).json({ success: false, error: 'Spreadsheet link expired.' });
  }

  const fullPath = path.join(STORAGE_DIR, record.storage_filename);
  if (!isSafePath(STORAGE_DIR, fullPath) || !fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, error: 'Workbook binary file missing from storage.' });
  }

  // Safely increment download counter in SQLite
  try {
    incrementDownloadCount(fileId);
  } catch (err) {
    console.warn('Could not increment download count:', err);
  }

  res.download(fullPath, record.original_filename, (err) => {
    if (err && !res.headersSent) {
      console.error('[Download error]', err);
      res.status(500).json({ success: false, error: 'Failed to download file.' });
    }
  });
});

/**
 * GET /api/files/:id/data
 * Server-side parsed worksheet data endpoint (returns sheet names and row/column arrays)
 */
router.get('/:id/data', async (req, res) => {
  const fileId = req.params.id;

  if (!isValidUUID(fileId)) {
    return res.status(400).json({ success: false, error: 'Invalid file ID.' });
  }

  const record = getFileRecordById(fileId);
  if (!record || !record.is_active) {
    return res.status(404).json({ success: false, error: 'Spreadsheet unavailable.' });
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return res.status(410).json({ success: false, error: 'Spreadsheet link expired.' });
  }

  const fullPath = path.join(STORAGE_DIR, record.storage_filename);
  if (!isSafePath(STORAGE_DIR, fullPath) || !fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, error: 'Workbook file missing from storage.' });
  }

  try {
    const fileBuffer = await fs.promises.readFile(fullPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames || [];
    const parsedSheets = {};

    sheetNames.forEach((name) => {
      const sheet = workbook.Sheets[name];
      if (sheet) {
        parsedSheets[name] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
          raw: false
        });
      } else {
        parsedSheets[name] = [];
      }
    });

    return res.json({
      success: true,
      id: record.id,
      filename: record.original_filename,
      sheetNames,
      sheets: parsedSheets
    });
  } catch (err) {
    console.error('[Workbook parsing error]', err);
    return res.status(500).json({ success: false, error: 'Failed to read workbook worksheets.' });
  }
});

/**
 * DELETE /api/files/:id
 * Delete a file and disable its share link
 * Requires either creator delete_token or server ADMIN_API_KEY
 */
router.delete('/:id', async (req, res) => {
  const fileId = req.params.id;

  if (!isValidUUID(fileId)) {
    return res.status(400).json({ success: false, error: 'Invalid file ID.' });
  }

  const record = getFileRecordById(fileId);
  if (!record) {
    return res.status(404).json({ success: false, error: 'File not found.' });
  }

  const clientDeleteToken = req.headers['x-delete-token'] || req.body?.delete_token;
  const clientApiKey = req.headers['x-api-key'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  const isAuthorizedCreator = record.delete_token && clientDeleteToken === record.delete_token;
  const isAuthorizedAdmin = ADMIN_API_KEY && clientApiKey === ADMIN_API_KEY;

  // Allow delete if authorized by token, or admin, or if no admin key configured and token was saved
  if (!isAuthorizedCreator && !isAuthorizedAdmin && ADMIN_API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized: Valid delete token or admin API key is required to delete this file.'
    });
  }

  try {
    // 1. Deactivate in SQLite database
    deactivateFileRecord(fileId);

    // 2. Remove physical file from dedicated storage directory
    const fullPath = path.join(STORAGE_DIR, record.storage_filename);
    if (isSafePath(STORAGE_DIR, fullPath) && fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }

    return res.json({
      success: true,
      message: 'File deleted and share link deactivated.'
    });
  } catch (err) {
    console.error('[Delete error]', err);
    return res.status(500).json({ success: false, error: 'Failed to delete file.' });
  }
});

export default router;
