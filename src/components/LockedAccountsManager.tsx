import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from './Card';

interface LockedAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  failedLoginAttempts: number;
  accountLockedUntil: string | null;
  lastFailedLoginAttempt: string | null;
  minutesRemaining: number;
  status: 'locked' | 'warning';
}

interface LockedAccountsManagerProps {
  onClose: () => void;
}

const LockedAccountsManager: React.FC<LockedAccountsManagerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [lockedAccounts, setLockedAccounts] = useState<LockedAccount[]>([]);
  const [warningAccounts, setWarningAccounts] = useState<LockedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLockedAccounts();
    // Refresh every 30 seconds to update remaining time
    const interval = setInterval(loadLockedAccounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLockedAccounts = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/users/locked`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLockedAccounts(data.locked || []);
        setWarningAccounts(data.warnings || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load locked accounts' }));
        setError(errorData.error || 'Failed to load locked accounts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locked accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (userId: string, email: string) => {
    if (!confirm(`Unlock account for ${email}?`)) return;

    setUnlocking(userId);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/users/${userId}/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await loadLockedAccounts();
        alert('Account unlocked successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to unlock account' }));
        alert(errorData.error || 'Failed to unlock account');
      }
    } catch (err) {
      alert('Failed to unlock account: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUnlocking(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatTimeRemaining = (minutes: number) => {
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes} minute(s)`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hour(s) ${mins} minute(s)`;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'student': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] px-6 py-4 border-b border-gray-200 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Locked Accounts Management</h2>
              <p className="text-white/80 text-sm mt-1">
                {lockedAccounts.length} locked, {warningAccounts.length} warnings
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">Loading locked accounts...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Locked Accounts */}
              {lockedAccounts.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-red-500">🔒</span>
                    Locked Accounts ({lockedAccounts.length})
                  </h3>
                  <div className="grid gap-4">
                    {lockedAccounts.map((account) => (
                      <Card key={account.id} className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-bold text-gray-800">{account.name || 'No name'}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getRoleBadgeColor(account.role)}`}>
                                {account.role}
                              </span>
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                                🔒 Locked
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{account.email}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Failed Attempts:</span>
                                <span className="ml-2 font-semibold text-red-600">{account.failedLoginAttempts}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Time Remaining:</span>
                                <span className="ml-2 font-semibold">{formatTimeRemaining(account.minutesRemaining)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Locked Until:</span>
                                <span className="ml-2 font-semibold">{formatDate(account.accountLockedUntil)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Last Attempt:</span>
                                <span className="ml-2 font-semibold">{formatDate(account.lastFailedLoginAttempt)}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnlock(account.id, account.email)}
                            disabled={unlocking === account.id}
                            className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {unlocking === account.id ? 'Unlocking...' : '🔓 Unlock'}
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Accounts (High failed attempts but not locked yet) */}
              {warningAccounts.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-yellow-500">⚠️</span>
                    Warning Accounts ({warningAccounts.length})
                  </h3>
                  <div className="grid gap-4">
                    {warningAccounts.map((account) => (
                      <Card key={account.id} className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-bold text-gray-800">{account.name || 'No name'}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getRoleBadgeColor(account.role)}`}>
                                {account.role}
                              </span>
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
                                ⚠️ Warning
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{account.email}</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Failed Attempts:</span>
                                <span className="ml-2 font-semibold text-yellow-600">{account.failedLoginAttempts}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Last Attempt:</span>
                                <span className="ml-2 font-semibold">{formatDate(account.lastFailedLoginAttempt)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Status:</span>
                                <span className="ml-2 font-semibold text-yellow-600">
                                  {account.failedLoginAttempts >= 4 ? 'Near lockout' : 'Multiple failures'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnlock(account.id, account.email)}
                            disabled={unlocking === account.id}
                            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {unlocking === account.id ? 'Resetting...' : '🔄 Reset'}
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {lockedAccounts.length === 0 && warningAccounts.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Locked Accounts</h3>
                  <p className="text-gray-600">All accounts are currently active and unlocked.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Auto-refreshes every 30 seconds
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadLockedAccounts}
                disabled={loading}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockedAccountsManager;

