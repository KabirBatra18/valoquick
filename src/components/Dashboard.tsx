'use client';

import React, { useState, useEffect } from 'react';
import { SavedReport, ReportMetadata } from '@/types/report';
import { getAllReports, createNewReport, deleteReport, updateReportStatus, duplicateReport } from '@/utils/storage';

interface DashboardProps {
  onOpenReport: (reportId: string) => void;
  onCreateReport: () => void;
}

export default function Dashboard({ onOpenReport, onCreateReport }: DashboardProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'concluded'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load reports and theme on mount
  useEffect(() => {
    setReports(getAllReports());
    // Load saved theme
    const savedTheme = localStorage.getItem('valoquick_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('valoquick_theme', newTheme);
  };

  const refreshReports = () => {
    setReports(getAllReports());
  };

  const handleCreateNew = () => {
    const newReport = createNewReport();
    onOpenReport(newReport.metadata.id);
  };

  const handleDelete = (id: string) => {
    deleteReport(id);
    refreshReports();
    setDeleteConfirm(null);
  };

  const handleStatusChange = (id: string, status: 'active' | 'concluded') => {
    updateReportStatus(id, status);
    refreshReports();
  };

  const handleDuplicate = (id: string) => {
    const newReport = duplicateReport(id);
    if (newReport) {
      refreshReports();
    }
  };

  const filteredReports = reports
    .filter(r => r.metadata.status === activeTab)
    .filter(r =>
      searchQuery === '' ||
      r.metadata.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.metadata.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const activeCount = reports.filter(r => r.metadata.status === 'active').length;
  const concludedCount = reports.filter(r => r.metadata.status === 'concluded').length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-50/80 backdrop-blur-xl border-b border-surface-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-text-primary">ValuQuick</h1>
              <p className="text-xs text-text-tertiary">Property Valuation Reports</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-surface-100 border border-surface-200 hover:bg-surface-200 transition-all duration-300"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* New Report Button */}
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl font-medium text-sm hover:bg-brand-dark transition-colors shadow-lg shadow-brand/25"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Report
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{activeCount}</p>
                <p className="text-xs text-text-tertiary">In Progress</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{concludedCount}</p>
                <p className="text-xs text-text-tertiary">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setActiveTab('active'); setSearchQuery(''); }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'active'
                ? 'bg-brand text-white shadow-lg shadow-brand/25'
                : 'bg-surface-100 text-text-secondary hover:bg-surface-200'
            }`}
          >
            In Progress ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('concluded')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'concluded'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-surface-100 text-text-secondary hover:bg-surface-200'
            }`}
          >
            Completed ({concludedCount})
          </button>
        </div>

        {/* Search - only in completed tab */}
        {activeTab === 'concluded' && (
          <div className="mb-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search completed reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-100 border border-surface-200 rounded-xl text-text-primary placeholder-text-tertiary text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        )}

        {/* Reports List */}
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-text-secondary mb-2">No {activeTab === 'active' ? 'active' : 'completed'} reports</p>
              <p className="text-text-tertiary text-sm mb-4">
                {activeTab === 'active'
                  ? 'Create a new report to get started'
                  : 'Completed reports will appear here'}
              </p>
              {activeTab === 'active' && (
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg font-medium text-sm hover:bg-brand-dark transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Report
                </button>
              )}
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.metadata.id}
                className="glass-card p-4 hover:border-brand/30 transition-all cursor-pointer"
                onClick={() => onOpenReport(report.metadata.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-text-primary truncate">
                        {report.metadata.propertyAddress}
                      </h3>
                      {report.metadata.status === 'concluded' && (
                        <span className="shrink-0 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-tertiary mb-2">
                      Ref: {report.formData.referenceNo || 'Not set'} • {formatDate(report.metadata.updatedAt)}
                    </p>

                    {/* Progress bar for active reports */}
                    {report.metadata.status === 'active' && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full transition-all"
                            style={{ width: `${report.metadata.completionPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-tertiary">
                          {report.metadata.completionPercentage}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {report.metadata.status === 'active' ? (
                      <button
                        onClick={() => handleStatusChange(report.metadata.id, 'concluded')}
                        className="p-2 rounded-lg hover:bg-emerald-500/20 text-text-tertiary hover:text-emerald-400 transition-colors"
                        title="Mark as completed"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(report.metadata.id, 'active')}
                        className="p-2 rounded-lg hover:bg-amber-500/20 text-text-tertiary hover:text-amber-400 transition-colors"
                        title="Reopen report"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDuplicate(report.metadata.id)}
                      className="p-2 rounded-lg hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors"
                      title="Duplicate"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {deleteConfirm === report.metadata.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(report.metadata.id)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          title="Confirm delete"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-2 rounded-lg hover:bg-surface-200 text-text-tertiary transition-colors"
                          title="Cancel"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(report.metadata.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
