'use client';

import FingerprintJS from '@fingerprintjs/fingerprintjs';

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
      return visitorId;
    } catch (error) {
      console.error('Failed to get device fingerprint:', error);
      // Fallback: generate a random ID and store in localStorage
      const fallbackId = localStorage.getItem('vq_device_id') || generateFallbackId();
      localStorage.setItem('vq_device_id', fallbackId);
      visitorId = fallbackId;
      return fallbackId;
    }
  })();

  return fpPromise;
}

function generateFallbackId(): string {
  return 'fallback_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function clearCachedFingerprint(): void {
  visitorId = null;
  fpPromise = null;
}
