import React, { useState, useEffect } from 'react';

interface ActivityLogEntry {
  _id: string;
  eventType: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  status: 'success' | 'failure' | 'pending' | 'blocked';
  errorMessage?: string;
  timestamp: string;
}

interface ActivityLogProps {
  onClose: () => void;
}

const ActivityLog: React.FC<ActivityLogProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    eventType: '',
    email: '',
    ipAddress: '',
    startDate: '',
    endDate: '',
    days: '7'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

  const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
  const token = localStorage.getItem('umar_academy_token');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...(filters.eventType && { eventType: filters.eventType }),
        ...(filters.email && { email: filters.email }),
        ...(filters.ipAddress && { ipAddress: filters.ipAddress }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`${API_BASE}/activity-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 1 });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/activity-logs/stats?days=${filters.days}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters.eventType, filters.email, filters.ipAddress, filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.days]);

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'login_attempt': 'Login Attempt',
      'login_success': 'Login Success',
      'login_failure': 'Login Failure',
      'password_reset_request': 'Password Reset Request',
      'password_reset_success': 'Password Reset Success',
      'password_reset_failure': 'Password Reset Failure',
      'user_created': 'User Created',
      'user_updated': 'User Updated',
      'user_deleted': 'User Deleted',
      'api_access': 'API Access',
      'unauthorized_access': 'Unauthorized Access',
      'rate_limit_exceeded': 'Rate Limit Exceeded',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'success': 'bg-green-100 text-green-800 border-green-300',
      'failure': 'bg-red-100 text-red-800 border-red-300',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'blocked': 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getEventTypeColor = (type: string) => {
    if (type.includes('success')) return 'text-green-600';
    if (type.includes('failure') || type.includes('unauthorized') || type.includes('rate_limit')) return 'text-red-600';
    if (type.includes('request') || type.includes('attempt')) return 'text-yellow-600';
    return 'text-primary';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleClearFilters = () => {
    setFilters({
      eventType: '',
      email: '',
      ipAddress: '',
      startDate: '',
      endDate: '',
      days: '7'
    });
    setCurrentPage(1);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <header className="bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.9)] px-6 sm:px-8 py-6 sm:py-8 border-b-4 border-accent shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-lg">Activity Log</h2>
              <p className="text-white/95 mt-2 text-sm sm:text-base font-medium">Monitor security events and user activities</p>
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center bg-accent text-primary rounded-full transition-all text-2xl sm:text-3xl font-extrabold shadow-2xl hover:scale-110 hover:bg-accent/90 border-2 border-white/40"
              title="Close"
            >
              ×
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-gradient-to-b from-background to-white">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-6">
              <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-soft-primary to-white p-4 sm:p-5 shadow-lg">
                <div className="text-2xl sm:text-3xl font-extrabold text-primary mb-1">
                  {stats.totalEvents || 0}
                </div>
                <div className="text-xs sm:text-sm text-primary/70 font-semibold">
                  Total Events ({stats.period})
                </div>
              </div>
              <div className="rounded-2xl border-2 border-green-500/30 bg-gradient-to-br from-green-50 to-white p-4 sm:p-5 shadow-lg">
                <div className="text-2xl sm:text-3xl font-extrabold text-green-600 mb-1">
                  {stats.recentLogins || 0}
                </div>
                <div className="text-xs sm:text-sm text-primary/70 font-semibold">
                  Successful Logins
                </div>
              </div>
              <div className="rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-50 to-white p-4 sm:p-5 shadow-lg">
                <div className="text-2xl sm:text-3xl font-extrabold text-red-600 mb-1">
                  {stats.failedLogins || 0}
                </div>
                <div className="text-xs sm:text-sm text-primary/70 font-semibold">
                  Failed Logins
                </div>
              </div>
              <div className="rounded-2xl border-2 border-orange-500/30 bg-gradient-to-br from-orange-50 to-white p-4 sm:p-5 shadow-lg">
                <div className="text-2xl sm:text-3xl font-extrabold text-orange-600 mb-1">
                  {stats.blockedAttempts || 0}
                </div>
                <div className="text-xs sm:text-sm text-primary/70 font-semibold">
                  Blocked Attempts
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-white to-soft-primary p-5 sm:p-7 shadow-lg mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <h3 className="text-lg sm:text-xl font-extrabold text-primary">Filters</h3>
              {(filters.eventType || filters.email || filters.ipAddress || filters.startDate || filters.endDate) && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-accent text-primary rounded-lg text-sm font-extrabold hover:bg-accent/90 transition-all shadow-md"
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Event Type</label>
                <select
                  value={filters.eventType}
                  onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                  className="w-full rounded-xl border-2 border-primary/30 bg-white px-4 py-2.5 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-md transition-all hover:border-primary/50"
                >
                  <option value="">All Events</option>
                  <option value="login_attempt">Login Attempt</option>
                  <option value="login_success">Login Success</option>
                  <option value="login_failure">Login Failure</option>
                  <option value="password_reset_request">Password Reset Request</option>
                  <option value="password_reset_success">Password Reset Success</option>
                  <option value="password_reset_failure">Password Reset Failure</option>
                  <option value="user_created">User Created</option>
                  <option value="user_updated">User Updated</option>
                  <option value="user_deleted">User Deleted</option>
                  <option value="rate_limit_exceeded">Rate Limit Exceeded</option>
                  <option value="unauthorized_access">Unauthorized Access</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Email</label>
                <input
                  type="text"
                  value={filters.email}
                  onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                  placeholder="Filter by email..."
                  className="w-full rounded-xl border-2 border-primary/30 bg-white px-4 py-2.5 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-md transition-all hover:border-primary/50 placeholder:text-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">IP Address</label>
                <input
                  type="text"
                  value={filters.ipAddress}
                  onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })}
                  placeholder="Filter by IP..."
                  className="w-full rounded-xl border-2 border-primary/30 bg-white px-4 py-2.5 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-md transition-all hover:border-primary/50 placeholder:text-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full rounded-xl border-2 border-primary/30 bg-white px-4 py-2.5 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-md transition-all hover:border-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full rounded-xl border-2 border-primary/30 bg-white px-4 py-2.5 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-md transition-all hover:border-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Stats Period (Days)</label>
                <select
                  value={filters.days}
                  onChange={(e) => {
                    setFilters({ ...filters, days: e.target.value });
                    fetchStats();
                  }}
                  className="w-full rounded-xl border-2 border-primary/30 bg-white px-4 py-2.5 text-sm text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold shadow-md transition-all hover:border-primary/50"
                >
                  <option value="1">Last 24 Hours</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Activity Log Table */}
          <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-white to-soft-primary p-5 sm:p-7 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg sm:text-xl font-extrabold text-primary">
                Activity Logs
              </h3>
              <span className="px-4 py-2 bg-primary text-white rounded-full text-xs sm:text-sm font-extrabold shadow-md">
                {pagination.total} {pagination.total === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-primary font-semibold">Loading activity logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-primary text-lg font-extrabold mb-2">No activity logs found</p>
                <p className="text-primary/70 text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-primary text-white">
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-extrabold">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-extrabold">Event Type</th>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-extrabold">User</th>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-extrabold">IP Address</th>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-extrabold">Status</th>
                        <th className="px-4 py-3 text-left text-xs sm:text-sm font-extrabold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log._id} className="hover:bg-soft-primary transition-colors">
                          <td className="px-4 py-3 text-xs sm:text-sm text-primary whitespace-nowrap">
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-xs sm:text-sm">
                            <span className={`font-extrabold ${getEventTypeColor(log.eventType)}`}>
                              {getEventTypeLabel(log.eventType)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs sm:text-sm text-primary">
                            <div>
                              {log.userEmail && (
                                <div className="font-semibold">{log.userEmail}</div>
                              )}
                              {log.userRole && (
                                <div className="text-primary/70 text-[10px]">{log.userRole}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs sm:text-sm text-primary font-mono">
                            {log.ipAddress || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-xs sm:text-sm">
                            <span className={`px-2 py-1 rounded-full border-2 font-extrabold text-xs ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs sm:text-sm text-primary">
                            {log.errorMessage && (
                              <div className="text-red-600 font-semibold">{log.errorMessage}</div>
                            )}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="text-primary/70 text-[10px] mt-1">
                                {JSON.stringify(log.details, null, 2).substring(0, 100)}
                                {JSON.stringify(log.details, null, 2).length > 100 && '...'}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t-2 border-primary/20">
                    <div className="text-sm text-primary font-semibold">
                      Page {pagination.page} of {pagination.pages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-extrabold hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                        disabled={currentPage === pagination.pages}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-extrabold hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ActivityLog;

