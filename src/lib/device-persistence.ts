'use client';

const DB_NAME = 'valoquick_device';
const STORE_NAME = 'device_store';
const DEVICE_KEY = 'device_id';
const COOKIE_NAME = 'vq_did';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

// Generate a unique device ID
function generateDeviceId(): string {
  return 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// IndexedDB operations
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getFromIndexedDB(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DEVICE_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch {
    return null;
  }
}

async function saveToIndexedDB(deviceId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(deviceId, DEVICE_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // Silently fail - we have other persistence methods
  }
}

// Cookie operations
function getFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

function saveToCookie(deviceId: string): void {
  if (typeof document === 'undefined') return;

  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(deviceId)}; expires=${expires}; path=/; SameSite=Lax`;
}

// localStorage operations (already used, but we'll integrate it)
function getFromLocalStorage(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('vq_device_id');
}

function saveToLocalStorage(deviceId: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('vq_device_id', deviceId);
}

/**
 * Get persistent device ID from multiple storage locations.
 * Priority: IndexedDB > Cookie > localStorage > Generate new
 * Syncs the ID across all storage locations.
 */
export async function getPersistentDeviceId(): Promise<string> {
  // Try to get from any existing source
  const indexedDbId = await getFromIndexedDB();
  const cookieId = getFromCookie();
  const localStorageId = getFromLocalStorage();

  // Use the first available ID (priority order)
  const existingId = indexedDbId || cookieId || localStorageId;

  if (existingId) {
    // Sync to all storage locations
    await syncDeviceId(existingId);
    return existingId;
  }

  // No existing ID found - generate new one
  const newId = generateDeviceId();
  await syncDeviceId(newId);
  return newId;
}

/**
 * Sync device ID to all storage locations
 */
async function syncDeviceId(deviceId: string): Promise<void> {
  saveToLocalStorage(deviceId);
  saveToCookie(deviceId);
  await saveToIndexedDB(deviceId);
}

/**
 * Get all persistent IDs for verification
 */
export async function getAllPersistentIds(): Promise<{
  indexedDbId: string | null;
  cookieId: string | null;
  localStorageId: string | null;
}> {
  return {
    indexedDbId: await getFromIndexedDB(),
    cookieId: getFromCookie(),
    localStorageId: getFromLocalStorage(),
  };
}
