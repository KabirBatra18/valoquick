'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReportFormData } from '@/types/report';
import { saveDraftLocally, removeLocalDraft, addToSyncQueue, getSyncQueue, removeSyncItem } from '@/lib/offline-storage';

interface UseOfflineSyncOptions {
  reportId: string | null;
  firmId: string | null;
  onSyncItem: (reportId: string, formData: ReportFormData) => Promise<void>;
}

export function useOfflineSync({ reportId, firmId, onSyncItem }: UseOfflineSyncOptions) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  // Track online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process sync queue when coming back online
  const processSyncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const queue = await getSyncQueue();
      setPendingCount(queue.length);

      for (const item of queue) {
        try {
          await onSyncItem(item.reportId, item.formData);
          await removeSyncItem(item.id);
          setPendingCount((prev) => Math.max(0, prev - 1));
        } catch {
          // Item failed to sync, leave in queue
          break;
        }
      }
    } catch {
      // Queue read error
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [onSyncItem]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      processSyncQueue();
    }
  }, [isOnline, processSyncQueue]);

  // Save form data with offline fallback
  const saveWithOfflineFallback = useCallback(
    async (formData: ReportFormData, saveToFirestore: () => Promise<void>) => {
      if (!reportId) return;

      // Always save locally as backup
      try {
        await saveDraftLocally(reportId, formData);
      } catch {
        // IndexedDB error - non-critical
      }

      if (isOnline) {
        try {
          await saveToFirestore();
          // Firestore succeeded — clean up the local backup
          try { await removeLocalDraft(reportId); } catch { /* non-critical */ }
        } catch {
          // Firestore failed while online - queue for later
          if (firmId) {
            await addToSyncQueue(reportId, firmId, formData);
            setPendingCount((prev) => prev + 1);
          }
        }
      } else {
        // Offline - queue for sync
        if (firmId) {
          await addToSyncQueue(reportId, firmId, formData);
          setPendingCount((prev) => prev + 1);
        }
      }
    },
    [reportId, firmId, isOnline]
  );

  return {
    isOnline,
    isSyncing,
    pendingCount,
    saveWithOfflineFallback,
    processSyncQueue,
  };
}
