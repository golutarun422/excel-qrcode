// IndexedDB-based local storage engine for offline/demo testing
import type { ExcelFileRecord } from '../types/excelFile';

const DB_NAME = 'excel_qr_demo_db';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_BLOBS = 'blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDemoFile(
  record: ExcelFileRecord,
  blob: Blob
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_FILES, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_FILES).put(record);
    tx.objectStore(STORE_BLOBS).put({ id: record.id, blob, filename: record.original_filename });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDemoFileRecord(fileId: string): Promise<ExcelFileRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_FILES], 'readonly');
    const req = tx.objectStore(STORE_FILES).get(fileId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getDemoFileBlob(fileId: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_BLOBS], 'readonly');
    const req = tx.objectStore(STORE_BLOBS).get(fileId);
    req.onsuccess = () => resolve(req.result?.blob || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDemoFile(fileId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_FILES, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_FILES).delete(fileId);
    tx.objectStore(STORE_BLOBS).delete(fileId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
