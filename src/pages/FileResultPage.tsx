import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import type { ExcelFileRecord } from '../types/excelFile';
import { QRCodePreview } from '../components/QRCodePreview';
import { FileActions } from '../components/FileActions';
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog';
import { deleteExcelFile } from '../services/excelFileService';
import { formatFileSize, formatDate } from '../utils/formatFileSize';
import { useToast } from '../components/Toast';

interface FileResultPageProps {
  record: ExcelFileRecord;
  accessUrl: string;
  onReset: () => void;
  onDeleted: () => void;
}

export const FileResultPage: React.FC<FileResultPageProps> = ({
  record,
  accessUrl,
  onReset,
  onDeleted,
}) => {
  const { success, error } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await deleteExcelFile(record);
      success('File deleted and QR code deactivated.');
      setIsDeleteDialogOpen(false);
      onDeleted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete file';
      error(msg);
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Upload Another File</span>
        </button>

        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Upload Complete
        </span>
      </div>

      {/* Main Grid: QR Preview Left, Details & Actions Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: QR Card */}
        <div className="md:col-span-5 flex flex-col items-center">
          <QRCodePreview accessUrl={accessUrl} filename={record.original_filename} />
        </div>

        {/* Right Column: Workbook Metadata & Action Controls */}
        <div className="md:col-span-7 space-y-6">
          {/* Metadata Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div className="overflow-hidden flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Ready to Share
                </span>
                <h2 className="text-lg font-bold text-white mt-1 truncate" title={record.original_filename}>
                  {record.original_filename}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatFileSize(record.file_size)} • {record.mime_type}
                </p>
              </div>
            </div>

            {/* Badges / Pill specs */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 text-[11px] block">Created</span>
                <span className="text-slate-300 font-medium">{formatDate(record.created_at)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 text-[11px] block">Sharing Mode</span>
                <span className="text-slate-300 font-medium capitalize flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {record.access_mode} Link
                </span>
              </div>
              {record.expires_at && (
                <div className="col-span-2 space-y-1 pt-1">
                  <span className="text-slate-500 text-[11px] block">Expiration</span>
                  <span className="text-amber-300 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Expires {formatDate(record.expires_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <FileActions
            record={record}
            accessUrl={accessUrl}
            onReset={onReset}
            onRequestDelete={() => setIsDeleteDialogOpen(true)}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        filename={record.original_filename}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
};
