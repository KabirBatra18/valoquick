'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminEmail } from '@/lib/admin-client';
import { authenticatedFetch } from '@/lib/api-client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Stats {
  firms: number;
  users: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  trialReportsUsed: number;
  blockedAttempts: number;
}

interface Firm {
  id: string;
  name: string;
  ownerEmail: string;
  membersCount: number;
  reportsCount: number;
  trialReportsUsed: number;
  createdAt: string | null;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
    seats: { total: number; purchased: number };
  } | null;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  firmId: string | null;
  firmName: string | null;
  role: string | null;
  hasSubscription: boolean;
  trialReportsUsed: number;
  createdAt: string | null;
  lastLoginAt: string | null;
  accessRevoked: boolean;
}

interface IpTrial {
  id: string;
  ipPrefix: string;
  linkedFirmIds: string[];
  linkedDeviceIds: string[];
  linkedUserIds: string[];
  createdAt: string | null;
  isWhitelisted: boolean;
}

interface DeviceTrial {
  id: string;
  deviceFingerprint: string;
  reportsGenerated: number;
  linkedGoogleIds: string[];
  firmActivated: string | null;
  ipPrefix: string | null;
  createdAt: string | null;
  isWhitelisted: boolean;
}

interface AdminReportSummary {
  id: string;
  title: string;
  propertyAddress: string;
  status: 'active' | 'concluded';
  createdAt: string | null;
  updatedAt: string | null;
  completionPercentage: number;
  createdBy: string;
}

interface FirmDetail {
  firm: Firm;
  reports: AdminReportSummary[];
}

interface TrendDataPoint {
  date: string;
  count: number;
}

interface TrendData {
  firms: TrendDataPoint[];
  users: TrendDataPoint[];
  subscriptions: TrendDataPoint[];
  revenue: TrendDataPoint[];
}

export default function AdminDashboard() {
  const { user, userDoc, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'firms' | 'users' | 'abuse'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [ipTrials, setIpTrials] = useState<IpTrial[]>([]);
  const [deviceTrials, setDeviceTrials] = useState<DeviceTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [firmDetail, setFirmDetail] = useState<FirmDetail | null>(null);
  const [firmDetailLoading, setFirmDetailLoading] = useState(false);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [trendDays, setTrendDays] = useState<number>(30);
  const [trendLoading, setTrendLoading] = useState(false);

  const isAdmin = isAdminEmail(userDoc?.email);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch trends
  const fetchTrends = async (days: number = 30) => {
    setTrendLoading(true);
    try {
      const response = await authenticatedFetch(`/api/admin/stats/trends?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setTrendData(data);
      }
    } catch (err) {
      console.error('Error fetching trends:', err);
    } finally {
      setTrendLoading(false);
    }
  };

  // Fetch firms
  const fetchFirms = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/firms');
      if (response.ok) {
        const data = await response.json();
        setFirms(data.firms);
      }
    } catch (err) {
      console.error('Error fetching firms:', err);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Fetch abuse data
  const fetchAbuse = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/abuse');
      if (response.ok) {
        const data = await response.json();
        setIpTrials(data.ipTrials);
        setDeviceTrials(data.deviceTrials);
      }
    } catch (err) {
      console.error('Error fetching abuse data:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (!authLoading && isAdmin) {
      setLoading(true);
      Promise.all([fetchStats(), fetchFirms(), fetchUsers(), fetchAbuse(), fetchTrends(trendDays)])
        .finally(() => setLoading(false));
    }
  }, [authLoading, isAdmin]);

  // Refetch trends when timeline changes
  useEffect(() => {
    if (!authLoading && isAdmin && !loading) {
      fetchTrends(trendDays);
    }
  }, [trendDays]);

  // Delete firm
  const handleDeleteFirm = async (firmId: string, firmName: string) => {
    if (!confirm(`Are you sure you want to delete "${firmName}"? This will remove all members, reports, and subscription data.`)) {
      return;
    }

    setActionLoading(firmId);
    try {
      const response = await authenticatedFetch('/api/admin/firms', {
        method: 'DELETE',
        body: JSON.stringify({ firmId }),
      });

      if (response.ok) {
        await Promise.all([fetchStats(), fetchFirms(), fetchUsers()]);
      } else {
        setError('Failed to delete firm');
      }
    } catch (err) {
      setError('Error deleting firm');
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch firm detail (drill-down)
  const fetchFirmDetail = async (firmId: string) => {
    setFirmDetailLoading(true);
    setSelectedFirmId(firmId);
    try {
      const response = await authenticatedFetch(`/api/admin/firms/${firmId}/reports`);
      if (response.ok) {
        const data = await response.json();
        setFirmDetail(data);
      } else {
        setError('Failed to load firm details');
        setSelectedFirmId(null);
      }
    } catch (err) {
      console.error('Error fetching firm detail:', err);
      setError('Error loading firm details');
      setSelectedFirmId(null);
    } finally {
      setFirmDetailLoading(false);
    }
  };

  const handleBackToFirms = () => {
    setSelectedFirmId(null);
    setFirmDetail(null);
  };

  // Handle abuse action
  const handleAbuseAction = async (type: 'ip' | 'device', id: string, action: string) => {
    setActionLoading(`${type}-${id}`);
    try {
      const response = await authenticatedFetch('/api/admin/abuse', {
        method: 'POST',
        body: JSON.stringify({ type, id, action }),
      });

      if (response.ok) {
        await fetchAbuse();
      } else {
        setError('Failed to perform action');
      }
    } catch (err) {
      setError('Error performing action');
    } finally {
      setActionLoading(null);
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Admin Access Required</h1>
          <p className="text-text-secondary">Please sign in to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
          <p className="text-text-secondary">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-surface-100 border-b border-surface-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">ValuQuick Admin</h1>
            <p className="text-sm text-text-tertiary">{userDoc?.email}</p>
          </div>
          <a href="/" className="text-sm text-brand hover:underline">
            Back to App
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'firms', 'users', 'abuse'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedFirmId(null); setFirmDetail(null); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'bg-brand text-white'
                  : 'bg-surface-100 text-text-secondary hover:bg-surface-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard
                    title="Total Firms"
                    value={stats.firms}
                    icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    color="brand"
                  />
                  <StatCard
                    title="Total Users"
                    value={stats.users}
                    icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    color="blue"
                  />
                  <StatCard
                    title="Active Subscriptions"
                    value={stats.activeSubscriptions}
                    icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    color="emerald"
                  />
                  <StatCard
                    title="Monthly Revenue"
                    value={formatCurrency(stats.monthlyRevenue)}
                    icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    color="amber"
                    isText
                  />
                  <StatCard
                    title="Trial Reports Used"
                    value={stats.trialReportsUsed}
                    icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    color="purple"
                  />
                  <StatCard
                    title="Blocked Attempts"
                    value={stats.blockedAttempts}
                    icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    color="red"
                  />
                </div>

                {/* Trend Charts */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-text-primary">Trends</h2>
                    <div className="flex gap-1">
                      {([
                        { label: '7D', value: 7 },
                        { label: '30D', value: 30 },
                        { label: '90D', value: 90 },
                        { label: '1Y', value: 365 },
                      ] as const).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setTrendDays(option.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            trendDays === option.value
                              ? 'bg-brand text-white'
                              : 'bg-surface-100 text-text-secondary hover:bg-surface-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {trendLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : trendData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TrendChart title="New Firms" data={trendData.firms} color="#6366f1" days={trendDays} />
                      <TrendChart title="New Users" data={trendData.users} color="#3b82f6" days={trendDays} />
                      <TrendChart title="New Subscriptions" data={trendData.subscriptions} color="#10b981" days={trendDays} />
                      <TrendChart title="Revenue" data={trendData.revenue} color="#f59e0b" days={trendDays} isCurrency />
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Firms Tab */}
            {activeTab === 'firms' && (
              selectedFirmId ? (
                <FirmDrillDown
                  firmDetail={firmDetail}
                  loading={firmDetailLoading}
                  onBack={handleBackToFirms}
                  formatDate={formatDate}
                />
              ) : (
                <div className="bg-surface-100 rounded-xl border border-surface-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-surface-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Firm</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Owner</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Members</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Reports</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Subscription</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200">
                      {firms.map((firm) => (
                        <tr
                          key={firm.id}
                          className="hover:bg-surface-200/50 cursor-pointer"
                          onClick={() => fetchFirmDetail(firm.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-text-primary">{firm.name}</div>
                            <div className="text-xs text-text-tertiary">{formatDate(firm.createdAt)}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{firm.ownerEmail}</td>
                          <td className="px-4 py-3 text-center text-sm text-text-secondary">{firm.membersCount}</td>
                          <td className="px-4 py-3 text-center text-sm text-text-secondary">{firm.reportsCount}</td>
                          <td className="px-4 py-3">
                            {firm.subscription ? (
                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                firm.subscription.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {firm.subscription.plan} - {firm.subscription.status}
                              </span>
                            ) : (
                              <span className="text-xs text-text-tertiary">Trial ({firm.trialReportsUsed}/5)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteFirm(firm.id, firm.name); }}
                              disabled={actionLoading === firm.id}
                              className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                            >
                              {actionLoading === firm.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {firms.length === 0 && (
                    <div className="px-4 py-8 text-center text-text-tertiary">No firms found</div>
                  )}
                </div>
              )
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-surface-100 rounded-xl border border-surface-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Firm</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Role</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-surface-200/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-text-primary">{u.displayName}</div>
                          <div className="text-xs text-text-tertiary">{u.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {u.firmName || <span className="text-text-tertiary">No firm</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.role && (
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              u.role === 'owner'
                                ? 'bg-amber-500/20 text-amber-400'
                                : u.role === 'admin'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-surface-200 text-text-secondary'
                            }`}>
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.hasSubscription ? (
                            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                              Subscribed
                            </span>
                          ) : u.accessRevoked ? (
                            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                              Revoked
                            </span>
                          ) : (
                            <span className="text-xs text-text-tertiary">Trial</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(u.lastLoginAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="px-4 py-8 text-center text-text-tertiary">No users found</div>
                )}
              </div>
            )}

            {/* Abuse Tab */}
            {activeTab === 'abuse' && (
              <div className="space-y-6">
                {/* IP Trials */}
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-3">IP Tracking ({ipTrials.length})</h3>
                  <div className="bg-surface-100 rounded-xl border border-surface-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-surface-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">IP Prefix</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Firms</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Devices</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-200">
                        {ipTrials.map((ip) => (
                          <tr key={ip.id} className={`hover:bg-surface-200/50 ${ip.linkedFirmIds.length > 1 ? 'bg-red-500/10' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="font-mono text-sm text-text-primary">{ip.ipPrefix}.*</div>
                              <div className="text-xs text-text-tertiary">{formatDate(ip.createdAt)}</div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-text-secondary">{ip.linkedFirmIds.length}</td>
                            <td className="px-4 py-3 text-center text-sm text-text-secondary">{ip.linkedDeviceIds.length}</td>
                            <td className="px-4 py-3 text-center">
                              {ip.isWhitelisted ? (
                                <span className="inline-flex px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                                  Whitelisted
                                </span>
                              ) : ip.linkedFirmIds.length > 1 ? (
                                <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                                  Blocked
                                </span>
                              ) : (
                                <span className="text-xs text-text-tertiary">Normal</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                onClick={() => handleAbuseAction('ip', ip.id, 'whitelist')}
                                disabled={actionLoading === `ip-${ip.id}`}
                                className="text-emerald-400 hover:text-emerald-300 text-xs disabled:opacity-50"
                              >
                                Whitelist
                              </button>
                              <button
                                onClick={() => handleAbuseAction('ip', ip.id, 'remove')}
                                disabled={actionLoading === `ip-${ip.id}`}
                                className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ipTrials.length === 0 && (
                      <div className="px-4 py-8 text-center text-text-tertiary">No IP trials recorded</div>
                    )}
                  </div>
                </div>

                {/* Device Trials */}
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-3">Device Tracking ({deviceTrials.length})</h3>
                  <div className="bg-surface-100 rounded-xl border border-surface-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-surface-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Device ID</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Reports</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Accounts</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-200">
                        {deviceTrials.slice(0, 50).map((device) => (
                          <tr key={device.id} className={`hover:bg-surface-200/50 ${device.linkedGoogleIds.length > 2 ? 'bg-red-500/10' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="font-mono text-xs text-text-primary truncate max-w-[200px]">{device.deviceFingerprint}</div>
                              <div className="text-xs text-text-tertiary">{device.ipPrefix ? `IP: ${device.ipPrefix}.*` : 'No IP'}</div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-text-secondary">{device.reportsGenerated}</td>
                            <td className="px-4 py-3 text-center text-sm text-text-secondary">{device.linkedGoogleIds.length}</td>
                            <td className="px-4 py-3 text-center">
                              {device.isWhitelisted ? (
                                <span className="inline-flex px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                                  Whitelisted
                                </span>
                              ) : device.linkedGoogleIds.length > 2 ? (
                                <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                                  Suspicious
                                </span>
                              ) : (
                                <span className="text-xs text-text-tertiary">Normal</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                onClick={() => handleAbuseAction('device', device.id, 'reset')}
                                disabled={actionLoading === `device-${device.id}`}
                                className="text-amber-400 hover:text-amber-300 text-xs disabled:opacity-50"
                              >
                                Reset
                              </button>
                              <button
                                onClick={() => handleAbuseAction('device', device.id, 'remove')}
                                disabled={actionLoading === `device-${device.id}`}
                                className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {deviceTrials.length === 0 && (
                      <div className="px-4 py-8 text-center text-text-tertiary">No device trials recorded</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  isText = false,
}: {
  title: string;
  value: number | string;
  icon: string;
  color: 'brand' | 'blue' | 'emerald' | 'amber' | 'purple' | 'red';
  isText?: boolean;
}) {
  const colorClasses = {
    brand: 'bg-brand/20 text-brand',
    blue: 'bg-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 text-purple-400',
    red: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <div>
          <p className={`${isText ? 'text-xl' : 'text-2xl'} font-bold text-text-primary`}>{value}</p>
          <p className="text-xs text-text-tertiary">{title}</p>
        </div>
      </div>
    </div>
  );
}

// Firm Drill-Down Component
function FirmDrillDown({
  firmDetail,
  loading,
  onBack,
  formatDate,
}: {
  firmDetail: FirmDetail | null;
  loading: boolean;
  onBack: () => void;
  formatDate: (dateString: string | null) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!firmDetail) {
    return (
      <div className="text-center py-12 text-text-tertiary">
        Failed to load firm details.
        <button onClick={onBack} className="ml-2 text-brand hover:underline">Go back</button>
      </div>
    );
  }

  const { firm, reports } = firmDetail;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={onBack}
          className="text-brand hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Firms
        </button>
        <span className="text-text-tertiary">/</span>
        <span className="text-text-primary font-medium">{firm.name}</span>
      </div>

      {/* Firm summary card */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{firm.name}</h2>
            <p className="text-sm text-text-tertiary">Created {formatDate(firm.createdAt)}</p>
          </div>
          {firm.subscription ? (
            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
              firm.subscription.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {firm.subscription.plan} - {firm.subscription.status}
            </span>
          ) : (
            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-surface-200 text-text-tertiary">
              Trial ({firm.trialReportsUsed}/5)
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-text-tertiary">Owner</p>
            <p className="text-sm font-medium text-text-primary">{firm.ownerEmail}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Members</p>
            <p className="text-sm font-medium text-text-primary">{firm.membersCount}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Reports</p>
            <p className="text-sm font-medium text-text-primary">{firm.reportsCount}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Subscription Ends</p>
            <p className="text-sm font-medium text-text-primary">
              {firm.subscription?.currentPeriodEnd
                ? formatDate(firm.subscription.currentPeriodEnd)
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Reports table */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-3">Reports ({reports.length})</h3>
        <div className="bg-surface-100 rounded-xl border border-surface-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Property Address</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Completion</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Updated</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-surface-200/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{report.title || 'Untitled Report'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary max-w-[200px] truncate">
                    {report.propertyAddress || 'No address'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      report.status === 'concluded'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: `${report.completionPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-tertiary">{report.completionPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(report.updatedAt)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(report.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length === 0 && (
            <div className="px-4 py-8 text-center text-text-tertiary">No reports found for this firm</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Trend Chart Component
function TrendChart({
  title,
  data,
  color,
  days,
  isCurrency = false,
}: {
  title: string;
  data: TrendDataPoint[];
  color: string;
  days: number;
  isCurrency?: boolean;
}) {
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    if (days <= 30) {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  const formatValue = (value: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toString();
  };

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const tickInterval = days <= 7 ? 0 : days <= 30 ? 4 : days <= 90 ? 13 : 30;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
        <span className="text-lg font-bold text-text-primary">
          {isCurrency ? formatValue(total) : total}
        </span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-surface-200)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
              axisLine={{ stroke: 'var(--color-surface-200)' }}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              width={isCurrency ? 50 : 30}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface-100)',
                border: '1px solid var(--color-surface-200)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
              }}
              labelFormatter={formatChartDate}
              formatter={(value: number) => [formatValue(value), title]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${title.replace(/\s/g, '')})`}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: 'var(--color-surface-100)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
