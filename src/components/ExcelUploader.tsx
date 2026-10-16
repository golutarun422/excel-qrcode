import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  FolderOpen
} from 'lucide-react';
import type { AccessMode } from '../types/excelFile';
import { validateExcelFile, DEFAULT_MAX_FILE_SIZE_BYTES } from '../utils/fileValidation';
import { formatFileSize } from '../utils/formatFileSize';
import { getStoredApiConfig } from '../services/apiConfig';

interface ExcelUploaderProps {
  onStartUpload: (file: File, options: { accessMode: AccessMode; expiresInHours: number | null }) => void;
  onOpenSettings: () => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({
  onStartUpload,
  onOpenSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Upload options
  const [accessMode, setAccessMode] = useState<AccessMode>('public');
  const [expiresInHours, setExpiresInHours] = useState<number | null>(null);

  const { isConfigured } = getStoredApiConfig();

  const handleProcessFile = async (file: File) => {
    setValidationError(null);
    const result = await validateExcelFile(file, DEFAULT_MAX_FILE_SIZE_BYTES);

    if (!result.isValid) {
      setValidationError(result.error || 'Invalid Excel file');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleProcessFile(e.target.files[0]);
    }
  };

  const handleConfirmAndUpload = () => {
    if (!selectedFile) return;

    if (!isConfigured) {
      onOpenSettings();
      return;
    }

    onStartUpload(selectedFile, {
      accessMode,
      expiresInHours,
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Missing Backend Banner */}
      {!isConfigured && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-200">Server Connection Required</h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                To store Excel workbooks locally and generate live QR codes, connect your local backend server (running on port 3001) or Cloudflare Tunnel.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shrink-0 shadow-lg shadow-amber-500/20"
          >
            Configure Server
          </button>
        </div>
      )}

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 transition-all duration-300 text-center flex flex-col items-center justify-center cursor-pointer ${
          isDragOver
            ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
            : selectedFile
            ? 'border-emerald-500/50 bg-slate-900/80 cursor-default'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          onChange={handleFileChange}
          className="hidden"
        />

        {!selectedFile ? (
          <>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-10 h-10" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Drag & Drop your Excel workbook
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-6">
              Drop your spreadsheet here, or browse files directly from your computer.
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Browse Excel Files</span>
            </button>

            {/* Formats & Limit badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8 text-xs text-slate-500">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-mono font-medium">
                .XLSX
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-mono font-medium">
                .XLS
              </span>
              <span>•</span>
              <span>Max size: <strong className="text-slate-300">50 MB</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Secure Local Storage & SQLite
              </span>
            </div>
          </>
        ) : (
          /* File Selected Preview State */
          <div className="w-full max-w-md space-y-6">
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-4 text-left">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div className="overflow-hidden flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base truncate">{selectedFile.name}</h4>
                  <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatFileSize(selectedFile.size)} • Validated Spreadsheet
                </p>
              </div>
            </div>

            {/* Customization Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {/* Expiration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Link Expiration
                </label>
                <select
                  value={expiresInHours === null ? 'never' : expiresInHours}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExpiresInHours(val === 'never' ? null : Number(val));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="never">Permanent (Never expires)</option>
                  <option value="24">24 Hours</option>
                  <option value="168">7 Days</option>
                  <option value="720">30 Days</option>
                </select>
              </div>

              {/* Access Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Access Mode
                </label>
                <select
                  value={accessMode}
                  onChange={(e) => setAccessMode(e.target.value as AccessMode)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="public">Public (Anyone with QR)</option>
                  <option value="private">Private (Restricted)</option>
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition"
              >
                Choose Another
              </button>
              <button
                type="button"
                onClick={handleConfirmAndUpload}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 transition transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Generate QR Code
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation error display */}
      {validationError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-200">Validation Error</p>
            <p className="mt-0.5">{validationError}</p>
          </div>
        </div>
      )}
    </div>
  );
};
