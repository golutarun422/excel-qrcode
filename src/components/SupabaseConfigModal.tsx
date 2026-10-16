import React, { useState } from 'react';
import {
  X,
  Database,
  Key,
  Globe,
  Copy,
  Check,
  ShieldAlert,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  Laptop
} from 'lucide-react';
import {
  getStoredApiConfig,
  saveStoredApiConfig,
  clearStoredApiConfig,
  getCustomBaseUrl,
  setCustomBaseUrl,
  testApiConnection,
  setDemoMode,
  type ConnectionTestResult,
} from '../services/apiConfig';
import { useToast } from './Toast';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SupabaseConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const { success, error } = useToast();
  const currentConfig = getStoredApiConfig();
  const currentBaseUrl = getCustomBaseUrl();

  const [url, setUrl] = useState(currentConfig.apiUrl || 'http://localhost:3001');
  const [apiKey, setApiKey] = useState(currentConfig.apiKey);
  const [baseUrl, setBaseUrlState] = useState(currentBaseUrl);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'tunnel' | 'instructions'>('credentials');

  // Connection testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testApiConnection(url, apiKey);
      setTestResult(res);
      if (res.success) {
        success('Local backend server connection verified!');
      } else {
        error('Server connection check failed. See details below.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test failed';
      setTestResult({ success: false, message: msg });
      error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      saveStoredApiConfig(url, apiKey);
      setCustomBaseUrl(baseUrl);
      success('Storage backend configuration saved!');
      onConfigSaved();
      onClose();
    } catch {
      error('Failed to save configuration.');
    }
  };

  const handleEnableDemoMode = () => {
    setDemoMode(true);
    success('Demo / Offline mode enabled! Files will be stored in browser storage.');
    onConfigSaved();
    onClose();
  };

  const handleReset = () => {
    clearStoredApiConfig();
    setUrl('http://localhost:3001');
    setApiKey('');
    setTestResult(null);
    success('Configuration reset to default localhost:3001.');
    onConfigSaved();
  };

  const tunnelCommand = `cloudflared tunnel --url http://localhost:3001`;

  const copyTunnelCmd = () => {
    navigator.clipboard.writeText(tunnelCommand);
    setCopiedCmd(true);
    success('Cloudflare command copied to clipboard!');
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Storage Backend & Tunnel</h2>
              <p className="text-xs text-slate-400">Windows Local Storage (C:\ExcelQRStorage) & Cloudflare Tunnel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 px-6 gap-6 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'credentials'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Backend & Diagnostics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tunnel')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'tunnel'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cloudflare Tunnel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('instructions')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'instructions'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Laptop Requirements
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'credentials' && (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Quick Demo Mode Notice */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Testing locally without server connection?
                  </span>
                  <p className="text-slate-400">
                    Enable Demo Mode to test uploading, generating QR codes, and viewing spreadsheets using in-browser storage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnableDemoMode}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition whitespace-nowrap self-start sm:self-auto"
                >
                  Enable Demo Mode
                </button>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <p className="font-semibold text-emerald-200">Local Storage on Windows Laptop</p>
                  <p className="mt-0.5 text-slate-400">
                    Files are stored directly in <code className="text-emerald-300 font-mono">C:\ExcelQRStorage\files</code> and metadata in SQLite. When deploying frontend on Vercel, enter your public Cloudflare Tunnel URL below.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Backend API URL (Cloudflare Tunnel or Localhost)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Server className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyz.trycloudflare.com or http://localhost:3001"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  For internet access from mobile phones, expose port 3001 using Cloudflare Tunnel and paste the HTTPS URL here.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Admin API Key (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Leave blank if ADMIN_API_KEY is not configured"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Only required if ADMIN_API_KEY is configured in your server .env</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Public Frontend App Domain (For QR Codes)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrlState(e.target.value)}
                    placeholder="https://your-vercel-domain.vercel.app"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave empty to use current domain (<code className="text-emerald-400">{typeof window !== 'undefined' ? window.location.origin : ''}</code>). Never encode localhost into QR codes.
                </p>
              </div>

              {/* Diagnostic Test Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !url}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
                >
                  <Activity className={`w-4 h-4 ${isTesting ? 'animate-spin' : 'text-emerald-400'}`} />
                  <span>{isTesting ? 'Testing Server Connection...' : 'Test Backend Connection & Storage'}</span>
                </button>
              </div>

              {/* Test Result Feedback */}
              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testResult.success ? 'Backend Operational' : 'Connection Warning'}</span>
                  </div>
                  <p className="leading-relaxed">{testResult.message}</p>
                  {testResult.details && (
                    <div className="pt-1 text-[11px] font-mono text-slate-400 space-y-0.5">
                      <div>Storage: {testResult.details.storageDirectory}</div>
                      <div>Database: {testResult.details.databaseLocation}</div>
                      <div>Active Files: {testResult.details.activeFiles}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
                >
                  Reset Defaults
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20"
                  >
                    Save & Connect
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'tunnel' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Expose Local Backend to Internet via Cloudflare Tunnel</span>
                </h4>
                <p className="text-slate-400">
                  Cloudflare Tunnel provides a secure HTTPS URL for your laptop backend without opening router ports or exposing your IP address.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <p className="font-semibold text-white">Step 1: Install cloudflared (if not already installed)</p>
                <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                  <code>winget install --id Cloudflare.cloudflared</code>
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">Step 2: Start Tunnel to port 3001</p>
                  <button
                    type="button"
                    onClick={copyTunnelCmd}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition"
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                  <code>{tunnelCommand}</code>
                </pre>
                <p className="text-slate-400 text-[11px]">
                  Cloudflare Tunnel will output a public HTTPS address like <code className="text-emerald-400">https://your-tunnel.trycloudflare.com</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="font-semibold text-white">Step 3: Connect Frontend</p>
                <p className="text-slate-400">
                  Paste the <code className="text-emerald-300">https://*.trycloudflare.com</code> URL into the <strong>Backend API URL</strong> field in the first tab and click <strong>Save & Connect</strong>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-amber-200">
                <h4 className="font-bold flex items-center gap-2 text-white">
                  <Laptop className="w-4 h-4 text-amber-400" />
                  Laptop Availability Notice
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Because spreadsheets are stored locally on this Windows laptop (<code className="text-emerald-400 font-mono">C:\ExcelQRStorage\files</code>) rather than in cloud storage, your laptop must:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                  <li>Remain powered on (disable sleep/hibernation when sharing active files).</li>
                  <li>Remain connected to the internet.</li>
                  <li>Keep the local backend server running (<code className="text-emerald-400 font-mono">npm run server</code>).</li>
                  <li>Keep the Cloudflare Tunnel running (<code className="text-emerald-400 font-mono">cloudflared tunnel</code>).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-semibold text-white">Recipient Experience</h4>
                <p className="text-slate-400">
                  When a recipient scans the QR code from their phone or mobile browser, their request is routed securely through Cloudflare Tunnel directly to your local backend. They can preview all worksheets and download the original file instantly.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ServerConfigModal = SupabaseConfigModal;
