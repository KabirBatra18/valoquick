'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReportFormData } from '@/types/report';
import { saveDraftLocally, removeLocalDraft, addToSyncQueue, getSyncQueue, removeSyncItem } from '@/lib/offline-storage';

interface UseOfflineSyncOptions {
  reportId: string | null;
  firmId: string | null;
  onSyncItem: (reportId: string, formData: ReportFormData) => Promise<void>;
  /** Optional: return the server's updatedAt ISO string for conflict detection */
  getServerUpdatedAt?: (reportId: string) => Promise<string | null>;
}

export function useOfflineSync({ reportId, firmId, onSyncItem, getServerUpdatedAt }: UseOfflineSyncOptions) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
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
          // Conflict detection: if we have a server timestamp checker and the item has updatedAt
          if (getServerUpdatedAt && item.updatedAt) {
            const serverUpdatedAt = await getServerUpdatedAt(item.reportId);
            if (serverUpdatedAt && serverUpdatedAt > item.updatedAt) {
              // Server version is newer — skip this item (keep server version)
              console.warn(`[OfflineSync] Conflict detected for report ${item.reportId}: server is newer, discarding local changes`);
              await removeSyncItem(item.id);
              setConflictCount((prev) => prev + 1);
              setPendingCount((prev) => Math.max(0, prev - 1));
              continue;
            }
          }

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
  }, [onSyncItem, getServerUpdatedAt]);

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
    conflictCount,
    saveWithOfflineFallback,
    processSyncQueue,
  };
}
