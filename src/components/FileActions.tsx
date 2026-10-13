import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  Trash2,
  PlusCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import type { ExcelFileRecord } from '../types/excelFile';
import { downloadQRCodePng, downloadQRCodeSvg } from '../services/qrCodeService';
import { downloadExcelFile } from '../services/excelFileService';
import { useToast } from './Toast';

interface FileActionsProps {
  record: ExcelFileRecord;
  accessUrl: string;
  onReset: () => void;
  onRequestDelete: () => void;
}

export const FileActions: React.FC<FileActionsProps> = ({
  record,
  accessUrl,
  onReset,
  onRequestDelete,
}) => {
  const { success, error } = useToast();
  const [hasCopied, setHasCopied] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [pngResolution, setPngResolution] = useState<number>(1024);
  const [showResMenu, setShowResMenu] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(accessUrl);
    setHasCopied(true);
    success('Permanent link copied to clipboard!');
    setTimeout(() => setHasCopied(false), 2500);
  };

  const handleDownloadPng = async (size: number) => {
    try {
      const baseFilename = record.original_filename.replace(/\.[^/.]+$/, '');
      await downloadQRCodePng(accessUrl, `${baseFilename}-qr-${size}px.png`, size);
      success(`Downloaded QR PNG (${size}x${size}px)`);
      setShowResMenu(false);
    } catch (err) {
      console.error(err);
      error('Failed to download QR code image.');
    }
  };

  const handleDownloadSvg = async () => {
    try {
      const baseFilename = record.original_filename.replace(/\.[^/.]+$/, '');
      await downloadQRCodeSvg(accessUrl, `${baseFilename}-qr-vector.svg`);
      success('Downloaded vector QR Code (SVG)');
    } catch (err) {
      console.error(err);
      error('Failed to download SVG QR code.');
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setIsDownloadingExcel(true);
      await downloadExcelFile(record);
      success('Excel workbook downloaded!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      error(msg);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Permanent link display & copy */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
        <div className="truncate flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
            Permanent Access Link
          </span>
          <p className="text-xs font-mono text-emerald-400 truncate select-all">{accessUrl}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={accessUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Test recipient link in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition shadow-sm"
          >
            {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{hasCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Primary Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Download PNG with resolution options */}
        <div className="relative">
          <div className="flex rounded-xl overflow-hidden shadow-lg shadow-emerald-500/10 border border-emerald-500/30">
            <button
              onClick={() => handleDownloadPng(pngResolution)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Download QR (PNG {pngResolution}px)</span>
            </button>
            <button
              onClick={() => setShowResMenu(!showResMenu)}
              className="px-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-l border-emerald-400/40 transition"
              title="Select Resolution"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {showResMenu && (
            <div className="absolute top-full mt-2 left-0 right-0 z-30 p-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-xl space-y-1">
              {[512, 1024, 2048].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPngResolution(size);
                    handleDownloadPng(size);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                    pngResolution === size ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>PNG {size} x {size} px</span>
                  {size === 2048 && <span className="text-[10px] text-emerald-400">Ultra High-Res</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Download SVG */}
        <button
          onClick={handleDownloadSvg}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Download Vector (SVG)</span>
        </button>

        {/* Download Original Excel */}
        <button
          onClick={handleDownloadExcel}
          disabled={isDownloadingExcel}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>{isDownloadingExcel ? 'Downloading...' : 'Download Original Excel'}</span>
        </button>

        {/* Generate Another QR */}
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-300 font-bold text-xs border border-teal-500/30 transition"
        >
          <PlusCircle className="w-4 h-4 text-teal-400" />
          <span>Generate Another QR</span>
        </button>
      </div>

      {/* Delete Option */}
      <div className="pt-2 flex justify-center">
        <button
          onClick={onRequestDelete}
          className="flex items-center gap-1.5 text-xs text-rose-400/80 hover:text-rose-400 hover:underline transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete File & Deactivate QR</span>
        </button>
      </div>
    </div>
  );
};
