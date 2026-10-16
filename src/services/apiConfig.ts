// Local Backend & Tunnel Configuration

const STORAGE_KEY_API_URL = 'excel_qr_api_url';
const STORAGE_KEY_API_KEY = 'excel_qr_api_key';
const STORAGE_KEY_BASE_URL = 'excel_qr_custom_base_url';
const STORAGE_KEY_DEMO_MODE = 'excel_qr_demo_mode';

// Default local backend URL (running on localhost:3001)
const DEFAULT_LOCAL_API_URL = 'http://localhost:3001';

/**
 * Normalizes API URL (ensures protocol and removes trailing slashes)
 */
export function normalizeApiUrl(inputUrl: string): string {
  let url = (inputUrl || '').trim();
  if (!url) return '';
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

export interface ApiConfig {
  apiUrl: string;
  apiKey: string;
  isConfigured: boolean;
  isDemoMode: boolean;
  isUsingLocalOverride: boolean;
}

export function getStoredApiConfig(): ApiConfig {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  const envApiKey = import.meta.env.VITE_ADMIN_API_KEY;

  const localApiUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_API_URL) : null;
  const localApiKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_API_KEY) : null;

  const rawUrl = (localApiUrl || envApiUrl || DEFAULT_LOCAL_API_URL).trim();
  const apiUrl = normalizeApiUrl(rawUrl);
  const apiKey = (localApiKey || envApiKey || '').trim();

  const isDemo = isDemoModeActive();
  const isConfigured = Boolean(apiUrl) || isDemo;

  return {
    apiUrl,
    apiKey,
    isConfigured,
    isDemoMode: isDemo,
    isUsingLocalOverride: Boolean(localApiUrl || localApiKey),
  };
}

export function saveStoredApiConfig(rawUrl: string, apiKey: string) {
  if (typeof window !== 'undefined') {
    const url = normalizeApiUrl(rawUrl);
    if (url) localStorage.setItem(STORAGE_KEY_API_URL, url);
    else localStorage.removeItem(STORAGE_KEY_API_URL);

    if (apiKey) localStorage.setItem(STORAGE_KEY_API_KEY, apiKey.trim());
    else localStorage.removeItem(STORAGE_KEY_API_KEY);

    if (url) {
      localStorage.removeItem(STORAGE_KEY_DEMO_MODE);
    }
  }
}

export function clearStoredApiConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_API_URL);
    localStorage.removeItem(STORAGE_KEY_API_KEY);
    localStorage.removeItem(STORAGE_KEY_DEMO_MODE);
  }
}

/**
 * Returns the public application URL used to generate recipient QR codes
 * Default: window.location.origin (e.g. your Vercel deployment https://myapp.vercel.app)
 */
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

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    serverConnected: boolean;
    storageDirectory?: string;
    databaseLocation?: string;
    activeFiles?: number;
    uptimeSeconds?: number;
  };
}

/**
 * Tests live connection to the local backend / Cloudflare Tunnel
 */
export async function testApiConnection(
  targetUrl?: string,
  targetKey?: string
): Promise<ConnectionTestResult> {
  const url = normalizeApiUrl(targetUrl || getStoredApiConfig().apiUrl);
  const key = (targetKey !== undefined ? targetKey : getStoredApiConfig().apiKey).trim();

  if (!url) {
    return {
      success: false,
      message: 'Please provide a valid backend API or Cloudflare Tunnel URL.',
    };
  }

  try {
    const headers: Record<string, string> = {};
    if (key) {
      headers['x-api-key'] = key;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        message: `Backend returned status ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    if (data.status === 'ok') {
      return {
        success: true,
        message: `Successfully connected to local backend! Storage: ${data.storage?.directory}, SQLite DB active.`,
        details: {
          serverConnected: true,
          storageDirectory: data.storage?.directory,
          databaseLocation: data.storage?.database,
          activeFiles: data.storage?.activeFiles,
          uptimeSeconds: data.uptimeSeconds,
        },
      };
    }

    return {
      success: false,
      message: `Server responded with unexpected format: ${JSON.stringify(data)}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return {
      success: false,
      message: `Failed to connect to backend at "${url}": ${msg}. Verify your laptop is running the backend server and Cloudflare Tunnel.`,
    };
  }
}

// Backwards compatibility aliases
export const getStoredSupabaseConfig = () => {
  const cfg = getStoredApiConfig();
  return {
    url: cfg.apiUrl,
    anonKey: cfg.apiKey,
    isConfigured: cfg.isConfigured,
    isRealSupabase: Boolean(cfg.apiUrl) && !cfg.isDemoMode,
    isDemoMode: cfg.isDemoMode,
    isUsingLocalOverride: cfg.isUsingLocalOverride,
  };
};

export const saveStoredSupabaseConfig = saveStoredApiConfig;
export const clearStoredSupabaseConfig = clearStoredApiConfig;
export const testSupabaseConnection = testApiConnection;
