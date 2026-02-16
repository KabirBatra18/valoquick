// IndexedDB-based offline form data storage
// Provides local backup when Firestore is unreachable

import { ReportFormData } from '@/types/report';

const DB_NAME = 'valoquick_offline';
const DB_VERSION = 1;
const STORE_DRAFTS = 'drafts';
const STORE_SYNC_QUEUE = 'sync_queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'reportId' });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Save form data locally (offline backup) */
export async function saveDraftLocally(
  reportId: string,
  formData: ReportFormData,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, 'readwrite');
    const store = tx.objectStore(STORE_DRAFTS);
    store.put({
      reportId,
      formData,
      savedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get locally saved draft */
export async function getLocalDraft(
  reportId: string,
): Promise<{ formData: ReportFormData; savedAt: string } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, 'readonly');
    const store = tx.objectStore(STORE_DRAFTS);
    const request = store.get(reportId);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        resolve({ formData: result.formData, savedAt: result.savedAt });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/** Remove local draft (after successful sync) */
export async function removeLocalDraft(reportId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, 'readwrite');
    const store = tx.objectStore(STORE_DRAFTS);
    store.delete(reportId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Add a pending sync operation */
export async function addToSyncQueue(
  reportId: string,
  firmId: string,
  formData: ReportFormData,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    // Remove existing entries for same report to avoid duplicates
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        if (cursor.value.reportId === reportId) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        // All old entries for this report deleted, add new one
        store.add({
          reportId,
          firmId,
          formData,
          queuedAt: new Date().toISOString(),
        });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all pending sync items */
export async function getSyncQueue(): Promise<
  Array<{ id: number; reportId: string; firmId: string; formData: ReportFormData; queuedAt: string }>
> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/** Remove a processed sync item */
export async function removeSyncItem(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
