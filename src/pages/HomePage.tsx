import React from 'react';
import {
  QrCode,
  FileSpreadsheet,
  Smartphone,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import type { AccessMode, LocalFileHistoryItem } from '../types/excelFile';
import { ExcelUploader } from '../components/ExcelUploader';
import { UploadProgress } from '../components/UploadProgress';

interface HomePageProps {
  onStartUpload: (file: File, options: { accessMode: AccessMode; expiresInHours: number | null }) => void;
  onOpenSettings: () => void;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatusMessage: string;
  uploadingFile: File | null;
  onCancelUpload?: () => void;
  recentItems: LocalFileHistoryItem[];
  onSelectRecent: (item: LocalFileHistoryItem) => void;
  onViewAllHistory: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onStartUpload,
  onOpenSettings,
  isUploading,
  uploadProgress,
  uploadStatusMessage,
  uploadingFile,
  onCancelUpload,
  recentItems,
  onSelectRecent,
  onViewAllHistory,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-inner">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instant Supabase Storage & Permanent Routing</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Turn any Excel file into a{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            shareable QR code
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Upload spreadsheets, generate permanent QR codes, and share instantly.
          Anyone can scan with their smartphone camera to open or download the original file—no app or login required.
        </p>

        {/* 3-Step Process Indicator */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2 text-left">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div>
              <h2 className="text-xs font-bold text-white">Upload Excel</h2>
              <p className="text-[11px] text-slate-400">.XLSX & .XLS files</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div>
              <h2 className="text-xs font-bold text-white">Generate QR</h2>
              <p className="text-[11px] text-slate-400">Permanent link route</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div>
              <h2 className="text-xs font-bold text-white">Scan & Download</h2>
              <p className="text-[11px] text-slate-400">Works on all phones</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Upload / Progress Box */}
      <div className="relative">
        {isUploading && uploadingFile ? (
          <UploadProgress
            filename={uploadingFile.name}
            fileSize={uploadingFile.size}
            progressPercent={uploadProgress}
            statusMessage={uploadStatusMessage}
            onCancel={onCancelUpload}
          />
        ) : (
          <ExcelUploader
            onStartUpload={onStartUpload}
            onOpenSettings={onOpenSettings}
          />
        )}
      </div>

      {/* Recent Uploads Quick List (if any exist) */}
      {recentItems.length > 0 && !isUploading && (
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Recent Uploads on this device</span>
            </h2>
            <button
              onClick={onViewAllHistory}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
            >
              <span>View all ({recentItems.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentItems.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectRecent(item)}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 text-left transition flex items-center justify-between group"
              >
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                    {item.filename}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Permanent /f/{item.id.slice(0, 8)}...</p>
                </div>
                <QrCode className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0 ml-2 transition" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-800/80 text-center sm:text-left">
        <div className="space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto sm:mx-0">
            <QrCode className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white">Permanent Application Route</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            QR encodes <code className="text-emerald-400">/f/:fileId</code>, ensuring the printed QR code never breaks even if storage URLs change.
          </p>
        </div>

        <div className="space-y-2">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto sm:mx-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white">Zero App Installation</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Recipient scans on iOS or Android and gets instant download access without logging in or registering.
          </p>
        </div>

        <div className="space-y-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto sm:mx-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white">Preserves Workbook Content</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            No destructive formula parsing or sheet conversions. Delivers the exact original binary file.
          </p>
        </div>
      </div>
    </div>
  );
};
