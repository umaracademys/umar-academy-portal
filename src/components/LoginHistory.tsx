import React, { useState, useEffect } from 'react';
import Card from './Card';

interface LoginHistoryEntry {
  id: string;
  date: string;
  timestamp: Date;
  ip: string;
  location: string;
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  device: string;
  status: 'success' | 'failure' | 'attempt';
  errorMessage?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
}

interface LoginHistoryProps {
  userId: string;
  userEmail?: string;
  userName?: string;
  showUserInfo?: boolean;
}

const LoginHistory: React.FC<LoginHistoryProps> = ({ userId, userEmail, userName, showUserInfo = false }) => {
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  useEffect(() => {
    const fetchLoginHistory = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/users/${userId}/login-history?page=${page}&limit=${limit}`, {
          headers: getAuthHeaders()
        });

        if (!response.ok) {
          let errorMessage = 'Failed to fetch login history';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // If response is not JSON, use status-based message
            if (response.status === 403) {
              errorMessage = 'You do not have permission to view this login history';
            } else if (response.status === 401) {
              errorMessage = 'Authentication required. Please log in again.';
            } else if (response.status === 404) {
              errorMessage = 'User not found or no login history available';
            } else if (response.status === 500) {
              errorMessage = 'Server error. Please try again later.';
            }
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setLoginHistory(data.loginHistory || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error('Error fetching login history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load login history');
        setLoginHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLoginHistory();
  }, [userId, page]);

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: 'bg-green-100 text-green-800 border-green-300',
      failure: 'bg-red-100 text-red-800 border-red-300',
      attempt: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };

    const labels = {
      success: 'Success',
      failure: 'Failed',
      attempt: 'Attempt'
    };

    return (
      <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${styles[status as keyof typeof styles] || styles.attempt}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getDeviceIcon = (device: string) => {
    if (device === 'Mobile') return '📱';
    if (device === 'Tablet') return '📱';
    return '💻';
  };

  return (
    <Card title={`Login History${showUserInfo && userName ? ` - ${userName}` : ''} (${total} total)`}>
      {showUserInfo && userEmail && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-700">
            <span className="text-gray-500">User:</span> {userEmail}
            {userName && ` (${userName})`}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      {loading && loginHistory.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading login history...</p>
        </div>
      ) : loginHistory.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-400">LH</span>
          </div>
          <p className="text-lg font-bold text-gray-900 mb-2">No Login History</p>
          <p className="text-sm text-gray-600">No login attempts recorded yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Browser</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">OS</th>
                  {showUserInfo && (
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">User</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loginHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{formatDate(entry.date)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(entry.status)}
                      {entry.errorMessage && (
                        <div className="text-xs text-red-600 mt-1 font-medium">{entry.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.ip}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{entry.location}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getDeviceIcon(entry.device)}</span>
                        <span className="text-sm font-medium text-gray-900">{entry.device}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {entry.browser}
                        {entry.browserVersion && <span className="text-gray-500"> {entry.browserVersion}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{entry.os}</div>
                    </td>
                    {showUserInfo && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {entry.userEmail || 'N/A'}
                          {entry.userRole && (
                            <span className="text-xs text-gray-500 ml-1">({entry.userRole})</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {loginHistory.map((entry) => (
              <div key={entry.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getDeviceIcon(entry.device)}</span>
                    {getStatusBadge(entry.status)}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date</div>
                    <div className="text-sm font-semibold text-gray-900">{formatDate(entry.date)}</div>
                  </div>
                </div>
                
                {entry.errorMessage && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-bold text-red-800">Error: {entry.errorMessage}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">IP Address</div>
                    <div className="font-semibold text-gray-900">{entry.ip}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Location</div>
                    <div className="font-semibold text-gray-900">{entry.location}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Browser</div>
                    <div className="font-semibold text-gray-900">
                      {entry.browser}
                      {entry.browserVersion && <span className="text-gray-600"> {entry.browserVersion}</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">OS</div>
                    <div className="font-semibold text-gray-900">{entry.os}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Device</div>
                    <div className="font-semibold text-gray-900">{entry.device}</div>
                  </div>
                  {showUserInfo && entry.userEmail && (
                    <div className="col-span-2">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">User</div>
                      <div className="font-semibold text-gray-900">
                        {entry.userEmail}
                        {entry.userRole && <span className="text-gray-600 ml-2">({entry.userRole})</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-700 font-semibold">
                Showing page {page} of {totalPages} ({total} total entries)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border-2 border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border-2 border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default LoginHistory;

