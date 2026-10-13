import type { FileValidationResult } from '../types/excelFile';

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/octet-stream', // some browsers fallback
  'application/x-zip-compressed', // some Windows browsers report for xlsx
];

export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
export const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Checks file header magic numbers
 * - PK.. (0x50, 0x4B, 0x03, 0x04) for .xlsx (ZIP format)
 * - D0 CF 11 E0 A1 B1 1A E1 for .xls (OLE Compound Document)
 */
export async function checkExcelMagicBytes(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check for ZIP signature (PK..) -> standard for xlsx
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
      return true;
    }

    // Check for OLE2 Compound File signature -> standard for legacy xls
    if (
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 &&
      bytes[5] === 0xb1 &&
      bytes[6] === 0x1a &&
      bytes[7] === 0xe1
    ) {
      return true;
    }

    // If file is tiny or non-standard, return false
    return false;
  } catch (error) {
    console.warn('Could not read file magic bytes:', error);
    // Fallback to extension/MIME check if buffer reading fails
    return true;
  }
}

/**
 * Validates file extension, size, and magic bytes
 */
export async function validateExcelFile(
  file: File,
  maxSizeBytes: number = DEFAULT_MAX_FILE_SIZE_BYTES
): Promise<FileValidationResult> {
  const filename = file.name || '';
  const lastDotIndex = filename.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return {
      isValid: false,
      error: 'The uploaded file does not have an extension. Please upload a .xlsx or .xls file.',
    };
  }

  const extension = filename.substring(lastDotIndex).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `Unsupported file extension "${extension}". Only .xlsx and .xls Excel files are supported.`,
    };
  }

  if (file.size <= 0) {
    return {
      isValid: false,
      error: 'The selected file is empty (0 bytes). Please select a valid Excel workbook.',
    };
  }

  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      isValid: false,
      error: `File size exceeds the limit of ${maxMb}MB. Please select a smaller file.`,
    };
  }

  // Validate magic bytes
  const isMagicBytesValid = await checkExcelMagicBytes(file);
  if (!isMagicBytesValid) {
    return {
      isValid: false,
      error: 'Invalid file format: File contents do not match genuine Excel (.xlsx/.xls) signatures.',
      details: {
        filename,
        size: file.size,
        extension,
        mimeType: file.type,
        isMagicBytesValid: false,
      },
    };
  }

  return {
    isValid: true,
    details: {
      filename,
      size: file.size,
      extension,
      mimeType: file.type || (extension === '.xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/vnd.ms-excel'),
      isMagicBytesValid: true,
    },
  };
}
