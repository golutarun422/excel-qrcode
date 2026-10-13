import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Clock,
  ShieldCheck,
  QrCode
} from 'lucide-react';
import type { LocalFileHistoryItem } from '../types/excelFile';
import { formatFileSize, formatDate } from '../utils/formatFileSize';
import { downloadQRCodePng } from '../services/qrCodeService';
import { useToast } from './Toast';

interface FileCardProps {
  item: LocalFileHistoryItem;
  onDelete: (id: string, filename: string) => void;
  onSelectForQr: (item: LocalFileHistoryItem) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  item,
  onDelete,
  onSelectForQr,
}) => {
  const { success, error } = useToast();
  const [copied, setCopied] = useState(false);

  const isExpired = item.expiresAt ? new Date(item.expiresAt) < new Date() : false;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.accessUrl);
    setCopied(true);
    success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = async () => {
    try {
      const baseFilename = item.filename.replace(/\.[^/.]+$/, '');
      await downloadQRCodePng(item.accessUrl, `${baseFilename}-qr.png`, 1024);
      success('QR Code downloaded!');
    } catch {
      error('Failed to download QR code.');
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all duration-200 shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 overflow-hidden">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="font-bold text-white text-sm truncate" title={item.filename}>
              {item.filename}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span>{formatFileSize(item.fileSize)}</span>
              <span>•</span>
              <span>{formatDate(item.uploadedAt)}</span>
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="shrink-0 flex items-center gap-1.5">
          {isExpired ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
              Expired
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Active
            </span>
          )}
        </div>
      </div>

      {/* Meta tags */}
      <div className="flex items-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1 font-mono">
          <Clock className="w-3 h-3 text-slate-500" />
          {item.expiresAt ? `Expires ${formatDate(item.expiresAt)}` : 'Permanent Link'}
        </span>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectForQr(item)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>View QR</span>
          </button>

          <button
            onClick={handleDownloadQr}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Download QR Image"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyLink}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Copy Permanent Link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <a
            href={item.accessUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Open link in browser"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <button
          onClick={() => onDelete(item.id, item.filename)}
          className="p-2 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition"
          title="Delete file"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
