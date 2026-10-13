import React from 'react';
import { FileSpreadsheet, Loader2, XCircle } from 'lucide-react';
import { formatFileSize } from '../utils/formatFileSize';

interface UploadProgressProps {
  filename: string;
  fileSize: number;
  progressPercent: number;
  statusMessage: string;
  onCancel?: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  filename,
  fileSize,
  progressPercent,
  statusMessage,
  onCancel,
}) => {
  return (
    <div className="w-full p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md animate-in fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <FileSpreadsheet className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm truncate max-w-xs sm:max-w-md">
              {filename}
            </h4>
            <p className="text-xs text-slate-400">{formatFileSize(fileSize)}</p>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {statusMessage}
          </span>
          <span className="font-mono font-bold text-white">{Math.round(progressPercent)}%</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-300 shadow-sm shadow-emerald-500/50"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
