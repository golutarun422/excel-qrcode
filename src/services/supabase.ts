// Re-export from apiConfig for backward compatibility
export {
  getStoredApiConfig,
  saveStoredApiConfig,
  clearStoredApiConfig,
  getCustomBaseUrl,
  setCustomBaseUrl,
  testApiConnection,
  setDemoMode,
  isDemoModeActive,
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  clearStoredSupabaseConfig,
  testSupabaseConnection,
} from './apiConfig';

export type { ConnectionTestResult } from './apiConfig';

export function getSupabaseClient() {
  return null;
}
