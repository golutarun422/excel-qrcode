import React, { useState } from 'react';
import {
  X,
  Database,
  Key,
  Globe,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  clearStoredSupabaseConfig,
  getCustomBaseUrl,
  setCustomBaseUrl,
  testSupabaseConnection,
  setDemoMode,
  type ConnectionTestResult,
} from '../services/supabase';
import { useToast } from './Toast';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const { success, error } = useToast();
  const currentConfig = getStoredSupabaseConfig();
  const currentBaseUrl = getCustomBaseUrl();

  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [baseUrl, setBaseUrlState] = useState(currentBaseUrl);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'sql' | 'instructions'>('credentials');

  // Connection testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(url, anonKey);
      setTestResult(res);
      if (res.success) {
        success('Supabase connection verified successfully!');
      } else {
        error('Connection check failed. See details below.');
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
      saveStoredSupabaseConfig(url, anonKey);
      setCustomBaseUrl(baseUrl);
      success('Supabase configuration saved!');
      onConfigSaved();
      onClose();
    } catch {
      error('Failed to save configuration.');
    }
  };

  const handleEnableDemoMode = () => {
    setDemoMode(true);
    success('Demo / Offline mode enabled! You can now upload and generate QR codes locally.');
    onConfigSaved();
    onClose();
  };

  const handleReset = () => {
    clearStoredSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    success('Configuration reset to defaults.');
    onConfigSaved();
  };

  const sqlCode = `-- SQL Setup for Excel QR Generator
-- 1. Create table
CREATE TABLE IF NOT EXISTS public.excel_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    access_mode TEXT NOT NULL DEFAULT 'public' CHECK (access_mode IN ('public', 'private')),
    expires_at TIMESTAMPTZ NULL,
    download_count INTEGER NOT NULL DEFAULT 0
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_excel_files_created_at ON public.excel_files (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_excel_files_is_active ON public.excel_files (is_active);

-- 3. Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'excel-files',
    'excel-files',
    true,
    52428800,
    ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Enable RLS
ALTER TABLE public.excel_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active files" ON public.excel_files
    FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Allow anonymous upload" ON public.excel_files
    FOR INSERT WITH CHECK (file_size <= 52428800 AND original_filename IS NOT NULL);

CREATE POLICY "Allow public updates" ON public.excel_files
    FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Storage Policies
CREATE POLICY "Allow public download" ON storage.objects
    FOR SELECT USING (bucket_id = 'excel-files');

CREATE POLICY "Allow anonymous upload to bucket" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'excel-files');

CREATE POLICY "Allow deletion" ON storage.objects
    FOR DELETE USING (bucket_id = 'excel-files');`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    success('SQL migration copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 2500);
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
              <h2 className="text-xl font-bold text-white">Supabase Configuration</h2>
              <p className="text-xs text-slate-400">Connect your Supabase PostgreSQL & Storage</p>
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
            API Credentials & Diagnostics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            SQL Setup Migration
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
            Setup Guide (3 Mins)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'credentials' && (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Quick Demo Mode Notice / Action */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Want to test immediately without Supabase setup?
                  </span>
                  <p className="text-slate-400">
                    Enable Demo Mode to upload spreadsheets, generate QR codes, and test mobile scanning using browser storage.
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
                  <p className="font-semibold text-emerald-200">Client-Safe Credentials</p>
                  <p className="mt-0.5 text-slate-400">
                    Only provide your public Supabase URL and Anon/Publishable Key. Never input your Service Role Key into any frontend application.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Supabase Project URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Server className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Found in Supabase Dashboard → Settings → API</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Supabase Anon (Publishable) Key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">The public anon key (safe for browser client)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Public App Base URL (For QR Links)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrlState(e.target.value)}
                    placeholder="https://excel-qr.vercel.app or http://192.168.1.100:5173"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave empty to use current domain (<code className="text-emerald-400">{typeof window !== 'undefined' ? window.location.origin : ''}</code>).
                </p>
              </div>

              {/* Diagnostic Test Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !url || !anonKey}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
                >
                  <Activity className={`w-4 h-4 ${isTesting ? 'animate-spin' : 'text-emerald-400'}`} />
                  <span>{isTesting ? 'Testing Supabase Connection...' : 'Test Connection & Storage Bucket'}</span>
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
                    <span>{testResult.success ? 'Diagnostics Passed' : 'Diagnostic Warning'}</span>
                  </div>
                  <p className="leading-relaxed">{testResult.message}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
                >
                  Clear Stored Settings
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

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Run this in your Supabase project&apos;s <strong>SQL Editor</strong> to create tables, storage buckets, and RLS policies:
                </p>
                <button
                  onClick={copySqlToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-96 leading-relaxed">
                <code>{sqlCode}</code>
              </pre>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">1</span>
                  Create a free project on Supabase
                </h4>
                <p className="text-slate-400">
                  Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a> and create a new project.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">2</span>
                  Run the SQL Migration
                </h4>
                <p className="text-slate-400">
                  In the Supabase sidebar, click <strong>SQL Editor</strong>, paste the script from the <strong>SQL Setup Migration</strong> tab, and click <strong>Run</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">3</span>
                  Copy API Keys
                </h4>
                <p className="text-slate-400">
                  Go to <strong>Project Settings → API</strong>. Copy your <strong>Project URL</strong> and <strong>anon (public)</strong> key into the <strong>API Credentials</strong> tab or your <code className="text-emerald-300">.env.local</code> file.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
