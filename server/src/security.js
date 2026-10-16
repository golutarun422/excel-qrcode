import path from 'path';
import rateLimit from 'express-rate-limit';
import { ADMIN_API_KEY, STORAGE_DIR } from './config.js';

// Strict UUID v4 regex
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Validates that an ID is a valid UUID
 */
export function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * Sanitizes original filename to prevent path traversal, control chars, or bad characters
 */
export function sanitizeFilename(filename) {
  if (!filename) return 'unnamed.xlsx';
  const basename = path.basename(filename);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Prevents directory traversal by verifying resolved path remains inside target directory
 */
export function isSafePath(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

/**
 * Validates Excel magic bytes
 * - 0x50 0x4B (PK..) for .xlsx (ZIP structure)
 * - 0xD0 0xCF 0x11 0xE0 for .xls (OLE2 Compound Document)
 */
export function checkExcelMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false;

  // XLSX (PK..)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return true;
  }

  // Legacy XLS
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return true;
  }

  return false;
}

/**
 * Authorization middleware for admin / upload operations if ADMIN_API_KEY is configured
 */
export function requireAdminOrOptionalAuth(req, res, next) {
  // If no ADMIN_API_KEY is set in environment, allow operation
  if (!ADMIN_API_KEY) {
    return next();
  }

  const clientKey = req.headers['x-api-key'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!clientKey || clientKey.trim() !== ADMIN_API_KEY.trim()) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing API key for this server.'
    });
  }

  next();
}

/**
 * Upload rate limiter (prevent spam or disk exhaustion)
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Max 60 uploads per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many uploads from this IP, please try again in 15 minutes.'
  }
});

/**
 * Public read rate limiter
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // Max 600 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please slow down.'
  }
});
