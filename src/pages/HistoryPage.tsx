import React, { useState } from 'react';
import {
  History,
  Search,
  Upload,
  FolderOpen
} from 'lucide-react';
import type { LocalFileHistoryItem } from '../types/excelFile';
import { FileCard } from '../components/FileCard';
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog';
import { removeLocalHistoryItem } from '../services/excelFileService';
import { useToast } from '../components/Toast';

interface HistoryPageProps {
  historyItems: LocalFileHistoryItem[];
  onRefreshHistory: () => void;
  onGoToUpload: () => void;
  onSelectForQr: (item: LocalFileHistoryItem) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  historyItems,
  onRefreshHistory,
  onGoToUpload,
  onSelectForQr,
}) => {
  const { success } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filename: string } | null>(null);

  const filteredItems = historyItems.filter((item) =>
    item.filename.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    removeLocalHistoryItem(deleteTarget.id);
    success('Removed from local history.');
    setDeleteTarget(null);
    onRefreshHistory();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Upload History & Files</h1>
            <p className="text-xs text-slate-400">
              Manage spreadsheets uploaded from this device and re-download QR codes
            </p>
          </div>
        </div>

        <button
          onClick={onGoToUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>New Upload</span>
        </button>
      </div>

      {/* Search Bar */}
      {historyItems.length > 0 && (
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files by name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      )}

      {/* Files Grid or Empty State */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <FileCard
              key={item.id}
              item={item}
              onDelete={(id, filename) => setDeleteTarget({ id, filename })}
              onSelectForQr={onSelectForQr}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              {historyItems.length === 0 ? 'No uploads yet' : 'No matching files found'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {historyItems.length === 0
                ? 'Upload an Excel workbook to automatically generate a QR code and track it here.'
                : `No spreadsheets matched "${searchQuery}".`}
            </p>
          </div>
          {historyItems.length === 0 && (
            <button
              onClick={onGoToUpload}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              Upload Excel File
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        isOpen={Boolean(deleteTarget)}
        filename={deleteTarget?.filename || ''}
        isDeleting={false}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
