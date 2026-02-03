'use client';

import { useState, useEffect, useCallback } from 'react';
import { SavedReport } from '@/types/report';
import {
  subscribeToReports,
  createReport,
  getReport,
  saveReport,
  deleteReport,
  updateReportStatus,
  duplicateReport,
} from '@/lib/firestore';

interface UseReportsResult {
  reports: SavedReport[];
  loading: boolean;
  error: string | null;
  createNewReport: () => Promise<string>;
  fetchReport: (reportId: string) => Promise<SavedReport | null>;
  saveCurrentReport: (report: SavedReport) => Promise<void>;
  removeReport: (reportId: string) => Promise<void>;
  changeReportStatus: (reportId: string, status: 'active' | 'concluded') => Promise<void>;
  copyReport: (reportId: string) => Promise<string>;
  refreshReports: () => void;
}

export function useReports(firmId: string | null, userId: string | null): UseReportsResult {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!firmId) {
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToReports(firmId, (updatedReports) => {
      setReports(updatedReports);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firmId, refreshKey]);

  const refreshReports = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const createNewReport = useCallback(async (): Promise<string> => {
    if (!firmId || !userId) {
      throw new Error('Must be signed in to a firm to create reports');
    }

    try {
      const reportId = await createReport(firmId, userId);
      return reportId;
    } catch (err) {
      console.error('Error creating report:', err);
      setError('Failed to create report');
      throw err;
    }
  }, [firmId, userId]);

  const fetchReport = useCallback(
    async (reportId: string): Promise<SavedReport | null> => {
      if (!firmId) {
        return null;
      }

      try {
        return await getReport(firmId, reportId);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to fetch report');
        return null;
      }
    },
    [firmId]
  );

  const saveCurrentReport = useCallback(
    async (report: SavedReport): Promise<void> => {
      if (!firmId || !userId) {
        throw new Error('Must be signed in to a firm to save reports');
      }

      try {
        await saveReport(firmId, report, userId);
      } catch (err) {
        console.error('Error saving report:', err);
        setError('Failed to save report');
        throw err;
      }
    },
    [firmId, userId]
  );

  const removeReport = useCallback(
    async (reportId: string): Promise<void> => {
      if (!firmId) {
        throw new Error('Must be signed in to a firm to delete reports');
      }

      try {
        await deleteReport(firmId, reportId);
      } catch (err) {
        console.error('Error deleting report:', err);
        setError('Failed to delete report');
        throw err;
      }
    },
    [firmId]
  );

  const changeReportStatus = useCallback(
    async (reportId: string, status: 'active' | 'concluded'): Promise<void> => {
      if (!firmId) {
        throw new Error('Must be signed in to a firm to update reports');
      }

      try {
        await updateReportStatus(firmId, reportId, status);
      } catch (err) {
        console.error('Error updating report status:', err);
        setError('Failed to update report status');
        throw err;
      }
    },
    [firmId]
  );

  const copyReport = useCallback(
    async (reportId: string): Promise<string> => {
      if (!firmId || !userId) {
        throw new Error('Must be signed in to a firm to duplicate reports');
      }

      try {
        return await duplicateReport(firmId, reportId, userId);
      } catch (err) {
        console.error('Error duplicating report:', err);
        setError('Failed to duplicate report');
        throw err;
      }
    },
    [firmId, userId]
  );

  return {
    reports,
    loading,
    error,
    createNewReport,
    fetchReport,
    saveCurrentReport,
    removeReport,
    changeReportStatus,
    copyReport,
    refreshReports,
  };
}
