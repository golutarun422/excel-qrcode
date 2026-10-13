import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Configuration keys for local overrides
const STORAGE_KEY_URL = 'excel_qr_supabase_url';
const STORAGE_KEY_KEY = 'excel_qr_supabase_anon_key';
const STORAGE_KEY_BASE_URL = 'excel_qr_custom_base_url';
const STORAGE_KEY_DEMO_MODE = 'excel_qr_demo_mode';

/**
 * Normalizes Supabase URL (ensures https:// and removes trailing slash)
 */
export function normalizeSupabaseUrl(inputUrl: string): string {
  let url = inputUrl.trim();
  if (!url) return '';
  // Auto-correct common name vs project ref typo
  if (url.includes('excel-qr-generator.supabase.co')) {
    return 'https://jngrhftemjrotagjugrp.supabase.co';
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}

export function isDemoModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_DEMO_MODE) === 'true';
}

export function setDemoMode(enabled: boolean) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(STORAGE_KEY_DEMO_MODE, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEY_DEMO_MODE);
  }
}

const DEFAULT_SUPABASE_URL = 'https://jngrhftemjrotagjugrp.supabase.co';
const DEFAULT_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ3JoZnRlbWpyb3RhZ2p1Z3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTg2MDAsImV4cCI6MjEwNzQzNDYwMH0.8HuBtaP0I65R_r16EvxCBvrCGepY3x0jeIzhQze8YIQ';

export function getStoredSupabaseConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const rawUrl = (localUrl || envUrl || DEFAULT_SUPABASE_URL).trim();
  const url = normalizeSupabaseUrl(rawUrl);
  const anonKey = (localKey || envKey || DEFAULT_SUPABASE_KEY).trim();

  const isDemo = isDemoModeActive();
  const hasRealCredentials = Boolean(url && anonKey && !url.includes('your-project-id'));

  return {
    url,
    anonKey,
    isConfigured: hasRealCredentials || isDemo,
    isRealSupabase: hasRealCredentials && !isDemo,
    isDemoMode: isDemo,
    isUsingLocalOverride: Boolean(localUrl || localKey),
  };
}

export function saveStoredSupabaseConfig(rawUrl: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    const url = normalizeSupabaseUrl(rawUrl);
    if (url) localStorage.setItem(STORAGE_KEY_URL, url);
    else localStorage.removeItem(STORAGE_KEY_URL);

    if (anonKey) localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    else localStorage.removeItem(STORAGE_KEY_KEY);

    // If real credentials are saved, turn off demo mode
    if (url && anonKey) {
      localStorage.removeItem(STORAGE_KEY_DEMO_MODE);
    }

    // Reset cached client
    supabaseClientInstance = null;
  }
}

export function clearStoredSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    localStorage.removeItem(STORAGE_KEY_DEMO_MODE);
    supabaseClientInstance = null;
  }
}

export function getCustomBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_KEY_BASE_URL);
    if (custom) return custom.trim();
  }
  return import.meta.env.VITE_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
}

export function setCustomBaseUrl(url: string) {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem(STORAGE_KEY_BASE_URL, url.trim());
    else localStorage.removeItem(STORAGE_KEY_BASE_URL);
  }
}

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isRealSupabase } = getStoredSupabaseConfig();
  if (!isRealSupabase) return null;

  if (!supabaseClientInstance) {
    try {
      supabaseClientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.error('Failed to create Supabase client:', err);
      return null;
    }
  }

  return supabaseClientInstance;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    apiConnected: boolean;
    tableFound: boolean;
    bucketFound: boolean;
  };
}

/**
 * Tests live connection to Supabase REST and Storage bucket
 */
export async function testSupabaseConnection(
  targetUrl?: string,
  targetKey?: string
): Promise<ConnectionTestResult> {
  const url = normalizeSupabaseUrl(targetUrl || getStoredSupabaseConfig().url);
  const key = (targetKey || getStoredSupabaseConfig().anonKey).trim();

  if (!url || !key) {
    return {
      success: false,
      message: 'Please provide both Supabase URL and Anon Key.',
    };
  }

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false },
    });

    // 1. Test database table accessibility
    const { error: dbError } = await client.from('excel_files').select('id').limit(1);

    const tableFound = !dbError || !dbError.message.includes('relation "public.excel_files" does not exist');

    // 2. Test storage bucket
    const { data: buckets, error: storageError } = await client.storage.listBuckets();
    const bucketFound = Boolean(buckets?.some((b) => b.name === 'excel-files' || b.id === 'excel-files'));

    if (!tableFound) {
      return {
        success: false,
        message: 'Connected to Supabase, but "excel_files" table was not found! Please run the SQL migration in SQL Editor.',
        details: { apiConnected: true, tableFound: false, bucketFound },
      };
    }

    if (storageError || !bucketFound) {
      return {
        success: false,
        message: 'Connected to Supabase, but storage bucket "excel-files" was not found or is private! Please run the SQL migration or create the bucket.',
        details: { apiConnected: true, tableFound: true, bucketFound: false },
      };
    }

    return {
      success: true,
      message: 'All checks passed! Supabase database and "excel-files" bucket are fully operational.',
      details: { apiConnected: true, tableFound: true, bucketFound: true },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return {
      success: false,
      message: `Failed to connect to Supabase: ${msg}. Check URL format and internet connection.`,
    };
  }
}
