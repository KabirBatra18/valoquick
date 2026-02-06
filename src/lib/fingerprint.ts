'use client';

import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { getPersistentDeviceId, getAllPersistentIds } from './device-persistence';

let visitorId: string | null = null;
let fpPromise: Promise<string> | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  // Return cached value if available
  if (visitorId) {
    return visitorId;
  }

  // Prevent multiple concurrent initializations
  if (fpPromise) {
    return fpPromise;
  }

  fpPromise = (async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      visitorId = result.visitorId;

      // Also sync with persistent storage for redundancy
      await getPersistentDeviceId();

      return visitorId;
    } catch (error) {
      console.error('Failed to get device fingerprint:', error);
      // Fallback: use persistent device ID (stored in multiple locations)
      const persistentId = await getPersistentDeviceId();
      visitorId = persistentId;
      return persistentId;
    }
  })();

  return fpPromise;
}

/**
 * Get the persistent device ID (stored in localStorage, IndexedDB, and cookie)
 * This is more resistant to browser data clearing than FingerprintJS alone
 */
export async function getPersistentId(): Promise<string> {
  return getPersistentDeviceId();
}

/**
 * Get all device identifiers for comprehensive tracking
 */
export async function getAllDeviceIds(): Promise<{
  fingerprintId: string;
  persistentId: string;
  persistentIds: {
    indexedDbId: string | null;
    cookieId: string | null;
    localStorageId: string | null;
  };
}> {
  const fingerprintId = await getDeviceFingerprint();
  const persistentId = await getPersistentDeviceId();
  const persistentIds = await getAllPersistentIds();

  return {
    fingerprintId,
    persistentId,
    persistentIds,
  };
}

export function clearCachedFingerprint(): void {
  visitorId = null;
  fpPromise = null;
}
