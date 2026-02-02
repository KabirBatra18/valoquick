// Local storage utilities for report persistence

import { SavedReport, ReportMetadata, ReportFormData, DEFAULT_FORM_DATA, calculateCompletionPercentage } from '@/types/report';

const STORAGE_KEY = 'valoquick_reports';

// Generate unique ID
export function generateId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get all reports from storage
export function getAllReports(): SavedReport[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading reports from storage:', error);
    return [];
  }
}

// Get a single report by ID
export function getReport(id: string): SavedReport | null {
  const reports = getAllReports();
  return reports.find(r => r.metadata.id === id) || null;
}

// Save a report (create or update)
export function saveReport(report: SavedReport): void {
  if (typeof window === 'undefined') return;

  try {
    const reports = getAllReports();
    const existingIndex = reports.findIndex(r => r.metadata.id === report.metadata.id);

    // Update metadata
    report.metadata.updatedAt = new Date().toISOString();
    report.metadata.completionPercentage = calculateCompletionPercentage(report.formData);
    report.metadata.propertyAddress = report.formData.propertyNo
      ? `${report.formData.propertyNo}, ${report.formData.block}, ${report.formData.area}`
      : 'Untitled Property';

    if (existingIndex >= 0) {
      reports[existingIndex] = report;
    } else {
      reports.unshift(report); // Add to beginning
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error('Error saving report:', error);
  }
}

// Create a new report
export function createNewReport(): SavedReport {
  const now = new Date().toISOString();
  const id = generateId();

  return {
    metadata: {
      id,
      title: 'New Valuation Report',
      propertyAddress: 'Untitled Property',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      completionPercentage: 0,
    },
    formData: { ...DEFAULT_FORM_DATA },
  };
}

// Delete a report
export function deleteReport(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const reports = getAllReports();
    const filtered = reports.filter(r => r.metadata.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting report:', error);
  }
}

// Update report status
export function updateReportStatus(id: string, status: 'active' | 'concluded'): void {
  const report = getReport(id);
  if (report) {
    report.metadata.status = status;
    saveReport(report);
  }
}

// Duplicate a report
export function duplicateReport(id: string): SavedReport | null {
  const original = getReport(id);
  if (!original) return null;

  const now = new Date().toISOString();
  const newReport: SavedReport = {
    metadata: {
      ...original.metadata,
      id: generateId(),
      title: `${original.metadata.title} (Copy)`,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    formData: { ...original.formData },
  };

  saveReport(newReport);
  return newReport;
}
