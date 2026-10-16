import { useState, useEffect, useCallback } from 'react';
import type { AccessMode, ExcelFileRecord, LocalFileHistoryItem } from './types/excelFile';
import {
  getLocalUploadHistory,
  uploadExcelWorkbook,
  getExcelFileRecord,
} from './services/excelFileService';
import { buildFileAccessUrl } from './services/qrCodeService';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { FileResultPage } from './pages/FileResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { PublicFilePage } from './pages/PublicFilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ServerConfigModal } from './components/SupabaseConfigModal';
import { ToastProvider, useToast } from './components/Toast';

function AppContent() {
  const { success, error } = useToast();

  // Route state
  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  // App navigation state
  const [currentTab, setCurrentTab] = useState<'home' | 'history'>('home');
  const [activeRecord, setActiveRecord] = useState<ExcelFileRecord | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<LocalFileHistoryItem[]>([]);

  const refreshHistory = useCallback(() => {
    setHistoryItems(getLocalUploadHistory());
  }, []);

  useEffect(() => {
    refreshHistory();

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [refreshHistory]);

  // Extract fileId if on /f/:fileId
  const matchFileRoute = currentPath.match(/^\/f\/([a-zA-Z0-9-_]+)/);
  const recipientFileId = matchFileRoute ? matchFileRoute[1] : null;

  // Handle uploading Excel file
  const handleStartUpload = async (
    file: File,
    options: { accessMode: AccessMode; expiresInHours: number | null }
  ) => {
    try {
      setIsUploading(true);
      setUploadingFile(file);
      setUploadProgress(15);
      setUploadStatusMessage('Validating workbook contents...');

      await new Promise((r) => setTimeout(r, 400));
      setUploadProgress(45);
      setUploadStatusMessage('Saving to Local Storage...');

      const record = await uploadExcelWorkbook(file, {
        accessMode: options.accessMode,
        expiresInHours: options.expiresInHours,
      });

      setUploadProgress(90);
      setUploadStatusMessage('Generating permanent QR Code route...');

      await new Promise((r) => setTimeout(r, 300));
      setUploadProgress(100);

      success('Excel workbook uploaded! QR Code is ready.');
      setActiveRecord(record);
      refreshHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      error(msg);
    } finally {
      setIsUploading(false);
      setUploadingFile(null);
      setUploadProgress(0);
    }
  };

  // If user selected a file from history to view its QR
  const handleSelectRecent = async (item: LocalFileHistoryItem) => {
    try {
      const res = await getExcelFileRecord(item.id);
      if (res.record) {
        setActiveRecord(res.record);
        setCurrentTab('home');
      } else {
        // Fallback synthetic record from history if offline or DB record unreachable
        setActiveRecord({
          id: item.id,
          original_filename: item.filename,
          storage_path: `spreadsheets/${item.id}/${item.filename}`,
          file_size: item.fileSize,
          mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          created_at: item.uploadedAt,
          is_active: true,
          access_mode: item.accessMode,
          expires_at: item.expiresAt,
          download_count: 0,
        });
        setCurrentTab('home');
      }
    } catch {
      error('Could not load file details.');
    }
  };

  // If we are on the recipient download route (/f/:fileId)
  if (recipientFileId) {
    return <PublicFilePage fileId={recipientFileId} />;
  }

  // If on an unknown subpath
  if (currentPath !== '/' && !currentPath.startsWith('/f/')) {
    return <NotFoundPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background ambient light */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-glow" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] animate-glow" />
      </div>

      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'home') setActiveRecord(null);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        historyCount={historyItems.length}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {currentTab === 'history' ? (
          <HistoryPage
            historyItems={historyItems}
            onRefreshHistory={refreshHistory}
            onGoToUpload={() => {
              setActiveRecord(null);
              setCurrentTab('home');
            }}
            onSelectForQr={handleSelectRecent}
          />
        ) : activeRecord ? (
          <FileResultPage
            record={activeRecord}
            accessUrl={buildFileAccessUrl(activeRecord.id)}
            onReset={() => setActiveRecord(null)}
            onDeleted={() => {
              setActiveRecord(null);
              refreshHistory();
            }}
          />
        ) : (
          <HomePage
            onStartUpload={handleStartUpload}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadStatusMessage={uploadStatusMessage}
            uploadingFile={uploadingFile}
            onCancelUpload={() => {
              setIsUploading(false);
              setUploadingFile(null);
            }}
            recentItems={historyItems}
            onSelectRecent={handleSelectRecent}
            onViewAllHistory={() => setCurrentTab('history')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Excel QR Generator • Powered by Local Storage & SQLite
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-slate-400 hover:text-emerald-400 transition"
            >
              Storage & Server Configuration
            </button>
            <span>•</span>
            <span className="font-mono text-[11px] text-slate-500">Level H Error Correction</span>
          </div>
        </div>
      </footer>

      {/* Storage Backend & Tunnel Settings Modal */}
      <ServerConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={refreshHistory}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
