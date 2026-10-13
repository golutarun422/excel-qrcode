import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileQuestion,
  Loader2,
  Share2,
  Check,
  Eye,
  ExternalLink
} from 'lucide-react';
import type { ExcelFileRecord } from '../types/excelFile';
import {
  getExcelFileRecord,
  downloadExcelFile,
  fetchExcelFileBlob,
} from '../services/excelFileService';
import { formatFileSize, formatDate } from '../utils/formatFileSize';
import { ExcelViewer } from '../components/ExcelViewer';
import { useToast } from '../components/Toast';

interface PublicFilePageProps {
  fileId: string;
}

export const PublicFilePage: React.FC<PublicFilePageProps> = ({ fileId }) => {
  const { success, error } = useToast();
  const [record, setRecord] = useState<ExcelFileRecord | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [activeView, setActiveView] = useState<'sheet' | 'details'>('sheet');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getExcelFileRecord(fileId)
      .then(async (res) => {
        if (!isMounted) return;
        if (res.record) {
          setRecord(res.record);
          try {
            // Load file blob to render in-browser spreadsheet preview
            const blob = await fetchExcelFileBlob(res.record);
            if (isMounted) setFileBlob(blob);
          } catch (blobErr) {
            console.warn('Could not prefetch blob for viewer:', blobErr);
          }
        } else {
          setErrorStatus(res.errorStatus || 'not_found');
          setErrorMessage(res.errorMessage || 'Workbook not found.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorStatus('error');
        setErrorMessage(err.message || 'An error occurred while retrieving the file.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fileId]);

  const handleDownload = async () => {
    if (!record) return;
    try {
      setIsDownloading(true);
      await downloadExcelFile(record);
      success('Workbook downloaded successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: record?.original_filename || 'Excel Spreadsheet',
        text: 'View and download this shared Excel workbook',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setHasCopied(true);
      success('Link copied to clipboard!');
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-white">Opening Excel Workbook...</h2>
          <p className="text-xs text-slate-400">Loading spreadsheet data & download options</p>
        </div>
      </main>
    );
  }

  // Error / Inactive / Expired State
  if (errorStatus || !record) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[#0b0f19]">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            {errorStatus === 'expired' ? (
              <Clock className="w-8 h-8" />
            ) : errorStatus === 'inactive' ? (
              <AlertCircle className="w-8 h-8" />
            ) : (
              <FileQuestion className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">
              {errorStatus === 'expired'
                ? 'Link Has Expired'
                : errorStatus === 'inactive'
                ? 'Spreadsheet Unavailable'
                : 'Spreadsheet Not Found'}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              {errorMessage || 'This Excel file is no longer available or the link is invalid.'}
            </p>
          </div>

          <div className="pt-2">
            <a
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Go to Excel QR Generator
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
      {/* Sticky Recipient Navigation & Action Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* File Meta info */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-white truncate" title={record.original_filename}>
                  {record.original_filename}
                </h1>
                <span className="hidden md:inline px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {formatFileSize(record.file_size)} • Uploaded {formatDate(record.created_at)}
              </p>
            </div>
          </div>

          {/* Action buttons: Download & Share */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View switcher if on desktop */}
            <div className="hidden sm:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 mr-1">
              <button
                onClick={() => setActiveView('sheet')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeView === 'sheet'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Spreadsheet</span>
              </button>
              <button
                onClick={() => setActiveView('details')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeView === 'details'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Details</span>
              </button>
            </div>

            <button
              onClick={handleShareLink}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
              title="Share or Copy Link"
            >
              {hasCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Prominent Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Excel File</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Mobile View Toggle */}
        <div className="flex sm:hidden items-center justify-center bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveView('sheet')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeView === 'sheet'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open Sheet</span>
          </button>
          <button
            onClick={() => setActiveView('details')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeView === 'details'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>File Details</span>
          </button>
        </div>

        {/* 1. In-Browser Spreadsheet Viewer */}
        {activeView === 'sheet' && (
          <div className="space-y-4 animate-in fade-in">
            {fileBlob ? (
              <ExcelViewer blob={fileBlob} filename={record.original_filename} />
            ) : (
              <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-white">Fetching workbook data...</p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Download File Directly
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. File Details Card */}
        {activeView === 'details' && (
          <div className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-white break-words">{record.original_filename}</h2>
              <p className="text-xs text-slate-400">{formatFileSize(record.file_size)} • Excel Document</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Upload Date</span>
                <span className="text-slate-200 font-medium">{formatDate(record.created_at)}</span>
              </div>
              {record.expires_at && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>Expiration</span>
                  <span className="text-amber-300 font-medium">{formatDate(record.expires_at)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-400">
                <span>Access Mode</span>
                <span className="text-emerald-400 font-medium capitalize">{record.access_mode} Link</span>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Original Excel File</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <p>
            Powered by <a href="/" className="text-emerald-400 hover:underline font-semibold">Excel QR Generator</a>
          </p>
          <a
            href="/"
            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] transition"
          >
            <span>Create your own QR code</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </main>
  );
};
