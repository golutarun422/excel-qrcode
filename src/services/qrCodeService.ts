import QRCode from 'qrcode';
import type { QRGenerationOptions } from '../types/excelFile';
import { getCustomBaseUrl } from './supabase';

const DEFAULT_OPTIONS: Required<QRGenerationOptions> = {
  size: 512,
  errorCorrectionLevel: 'H', // High error correction (up to 30% damage recovery)
  margin: 3,
  darkColor: '#0f172a',
  lightColor: '#ffffff',
};

/**
 * Builds the permanent application file access URL
 * e.g. https://domain.com/f/d4b53460-705c-4da6-a6ae-a010c2d3a3c9
 */
export function buildFileAccessUrl(fileId: string): string {
  const baseUrl = getCustomBaseUrl().replace(/\/+$/, '');
  return `${baseUrl}/f/${fileId}`;
}

/**
 * Generate QR code as a PNG Data URL
 */
export async function generateQRCodeDataUrl(
  text: string,
  options?: QRGenerationOptions
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return QRCode.toDataURL(text, {
    width: opts.size,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    margin: opts.margin,
    color: {
      dark: opts.darkColor,
      light: opts.lightColor,
    },
  });
}

/**
 * Generate QR code as an SVG string
 */
export async function generateQRCodeSvg(
  text: string,
  options?: QRGenerationOptions
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return QRCode.toString(text, {
    type: 'svg',
    width: opts.size,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    margin: opts.margin,
    color: {
      dark: opts.darkColor,
      light: opts.lightColor,
    },
  });
}

/**
 * Trigger browser download for PNG format
 */
export async function downloadQRCodePng(
  text: string,
  filename: string = 'excel-qr-code.png',
  size: number = 1024
): Promise<void> {
  const dataUrl = await generateQRCodeDataUrl(text, { size });
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Trigger browser download for SVG format
 */
export async function downloadQRCodeSvg(
  text: string,
  filename: string = 'excel-qr-code.svg'
): Promise<void> {
  const svgString = await generateQRCodeSvg(text);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
