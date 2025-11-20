import React, { useState, useEffect } from 'react';
import Card from './Card';

interface StudentCredentialsProps {
  student: any;
  onClose: () => void;
}

interface UserDetails {
  id: string;
  accountStatus: string;
  loginEnabled: boolean;
  lastLogin: string | null;
  passwordChanged: string | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface LoginHistoryEntry {
  id: string;
  date: string;
  ip: string;
  location: string;
  device: string;
  status: 'success' | 'failure' | 'attempt';
}

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

const getAuthToken = () => {
  return localStorage.getItem('umar_academy_token') || '';
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const StudentCredentials: React.FC<StudentCredentialsProps> = ({ student, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accountSettings, setAccountSettings] = useState({
    loginEnabled: true,
    twoFactorEnabled: false,
    emailNotifications: true,
    smsNotifications: false
  });

  // Get user ID from student (could be userId or id or _id, or userId._id if populated)
  const getUserId = () => {
    if (student.userId) {
      // Handle both string and object (MongoDB populated) userId
      return typeof student.userId === 'object' && student.userId._id 
        ? student.userId._id 
        : student.userId;
    }
    // Fallback: try to find User by email if userId is not available
    return null;
  };

  // Get user email for fallback lookup
  const getUserEmail = () => {
    return student.email || null;
  };

  // Fetch user details on mount
  useEffect(() => {
    const fetchUserDetails = async () => {
      let userId = getUserId();
      const userEmail = getUserEmail();

      // If no userId, try to find User by email
      if (!userId && userEmail) {
        try {
          const usersResponse = await fetch(`${API_BASE}/users`, {
            headers: getAuthHeaders()
          });
          if (usersResponse.ok) {
            const users = await usersResponse.json();
            const user = users.find((u: any) => u.email === userEmail);
            if (user) {
              userId = user._id || user.id;
              console.log(`✅ Found User by email: ${userEmail}, userId: ${userId}`);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch users for email lookup:', err);
        }
      }

      if (!userId) {
        setError('User ID not found for this student. The student may not have a linked User account.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE}/users/${userId}/details`, {
          headers: getAuthHeaders()
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          if (response.status === 403) {
            throw new Error('Access denied. Admin privileges required to view user details.');
          } else if (response.status === 404) {
            throw new Error('User not found. The student may not have a linked User account.');
          }
          throw new Error(errorData.error || 'Failed to fetch user details');
        }

        const data = await response.json();
        setUserDetails(data);
        setAccountSettings({
          loginEnabled: data.loginEnabled !== false,
          twoFactorEnabled: data.twoFactorEnabled || false,
          emailNotifications: data.emailNotifications !== false,
          smsNotifications: data.smsNotifications || false
        });
      } catch (err) {
        console.error('Error fetching user details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [student]);

  // Fetch login history when history tab is active
  useEffect(() => {
    if (activeTab === 'history') {
      const fetchLoginHistory = async () => {
        const userId = getUserId();
        if (!userId) return;

        try {
          const response = await fetch(`${API_BASE}/users/${userId}/login-history`, {
            headers: getAuthHeaders()
          });

          if (!response.ok) {
            throw new Error('Failed to fetch login history');
          }

          const data = await response.json();
          setLoginHistory(data.loginHistory || []);
        } catch (err) {
          console.error('Error fetching login history:', err);
          setLoginHistory([]);
        }
      };

      fetchLoginHistory();
    }
  }, [activeTab, student]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const resetPassword = async () => {
    if (!newPassword) return;
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setError('User ID not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/users/${userId}/password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password: newPassword })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }

      const data = await response.json();
      alert(`✅ Password reset successfully for ${student.fullName || student.name}`);
      setShowPasswordReset(false);
      setNewPassword('');
      
      // Refresh user details
      const detailsResponse = await fetch(`${API_BASE}/users/${userId}/details`, {
        headers: getAuthHeaders()
      });
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        setUserDetails(detailsData);
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password');
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Failed to reset password'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateAccountSettings = async () => {
    const userId = getUserId();
    if (!userId) {
      setError('User ID not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/users/${userId}/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(accountSettings)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update account settings');
      }

      const data = await response.json();
      setUserDetails(prev => prev ? { ...prev, ...accountSettings } : null);
      alert('✅ Account settings updated successfully');
      setShowAccountSettings(false);
    } catch (err) {
      console.error('Error updating account settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update account settings');
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Failed to update account settings'}`);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Credentials Overview', icon: 'OV' },
    { id: 'security', label: 'Security Settings', icon: 'SC' },
    { id: 'access', label: 'Access Control', icon: 'AC' },
    { id: 'notifications', label: 'Notifications', icon: 'NO' },
    { id: 'history', label: 'Login History', icon: 'LH' }
  ];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center space-x-4">
            <img
              src={
                student.avatar ||
                `https://ui-avatars.com/api/?name=${(student.fullName ?? student.name ?? 'Student').replace(' ', '+')}&background=2E4D32&color=fff`
              }
              alt={student.fullName ?? student.name ?? 'Student'}
              className="h-12 w-12 rounded-full border border-accent-soft"
            />
            <div>
              <h2 className="text-xl font-bold text-primary">Student Credentials</h2>
              <p className="text-sm text-primary-soft">
                Manage login and access settings for {student.fullName ?? student.name ?? 'this student'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-soft-primary text-xs font-semibold text-primary uppercase">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {loading && !userDetails && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-600">Loading user details...</div>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {activeTab === 'overview' && userDetails && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Status:</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        userDetails.accountStatus === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userDetails.accountStatus === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Login Enabled:</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        userDetails.loginEnabled
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userDetails.loginEnabled ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Login:</span>
                      <span className="text-gray-900">{formatDate(userDetails.lastLogin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Password Changed:</span>
                      <span className="text-gray-900">{formatDate(userDetails.passwordChanged)}</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Features</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Two-Factor Auth:</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        userDetails.twoFactorEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userDetails.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Security Questions:</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                        Not Available
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email Verified:</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        userDetails.emailVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {userDetails.emailVerified ? 'Yes' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone Verified:</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        userDetails.phoneVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {userDetails.phoneVerified ? 'Yes' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPasswordReset(true)}
                  className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)]"
                >
                  Reset password
                </button>
                <button
                  onClick={() => setShowAccountSettings(true)}
                  className="rounded-full border border-[rgba(var(--color-accent-rgb),0.45)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-soft-accent"
                >
                  Account settings
                </button>
                <button 
                  onClick={() => {
                    alert('Report generation: This would generate a credentials report for this student. API integration needed.');
                  }}
                  className="rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary"
                >
                  Generate report
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Management</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password Policy</label>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Minimum 8 characters</li>
                        <li>• Must contain uppercase and lowercase letters</li>
                        <li>• Must contain at least one number</li>
                        <li>• Must contain at least one special character</li>
                        <li>• Cannot reuse last 5 passwords</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPasswordReset(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    Reset Password
                  </button>
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">SMS Authentication</p>
                      <p className="text-sm text-gray-600">Receive verification codes via SMS</p>
                    </div>
                    <button 
                      onClick={() => {
                        setAccountSettings(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }));
                        alert('Two-Factor Authentication: This would enable SMS 2FA. API integration needed.');
                      }}
                      className={`px-4 py-2 rounded-lg transition ${
                        accountSettings.twoFactorEnabled
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {accountSettings.twoFactorEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Email Authentication</p>
                      <p className="text-sm text-gray-600">Receive verification codes via email</p>
                    </div>
                    <button 
                      onClick={() => {
                        setAccountSettings(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }));
                        alert('Two-Factor Authentication: This would enable Email 2FA. API integration needed.');
                      }}
                      className={`px-4 py-2 rounded-lg transition ${
                        accountSettings.twoFactorEnabled
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {accountSettings.twoFactorEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'access' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Access Control</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Student Portal Access</p>
                      <p className="text-sm text-gray-600">Allow student to access their portal</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={accountSettings.loginEnabled}
                        onChange={(e) => setAccountSettings(prev => ({ ...prev, loginEnabled: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={updateAccountSettings}
                      disabled={loading}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Save Access Settings'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Assignment Submission</p>
                      <p className="text-sm text-gray-600">Allow student to submit assignments</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Grade Viewing</p>
                      <p className="text-sm text-gray-600">Allow student to view their grades</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={accountSettings.emailNotifications}
                        onChange={(e) => setAccountSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">SMS Notifications</p>
                      <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={accountSettings.smsNotifications}
                        onChange={(e) => setAccountSettings(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={updateAccountSettings}
                      disabled={loading}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Save Notification Settings'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Push Notifications</p>
                      <p className="text-sm text-gray-600">Receive push notifications on mobile</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        defaultChecked
                        onChange={(e) => {
                          // Note: This would typically save to backend
                          console.log('Push Notifications:', e.target.checked);
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Login History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loginHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            No login history available
                          </td>
                        </tr>
                      ) : (
                        loginHistory.map((login) => (
                          <tr key={login.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(login.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{login.ip}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{login.location}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{login.device}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                login.status === 'success'
                                  ? 'bg-green-100 text-green-800'
                                  : login.status === 'failure'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {login.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-primary">Reset Password</h3>
            <p className="mb-4 text-sm text-primary-soft">
              Generate a new password for {student.fullName}.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Click Generate to create password"
                  />
                  <button
                    onClick={generatePassword}
                    className="rounded-full border border-[rgba(var(--color-accent-rgb),0.45)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-soft-accent"
                  >
                    Generate
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={resetPassword}
                  disabled={!newPassword || loading}
                  className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Reset password'}
                </button>
                <button
                  onClick={() => setShowPasswordReset(false)}
                  className="rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Modal */}
      {showAccountSettings && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-primary">Account Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Login Enabled</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={accountSettings.loginEnabled}
                    onChange={(e) => setAccountSettings(prev => ({ ...prev, loginEnabled: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Two-Factor Authentication</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={accountSettings.twoFactorEnabled}
                    onChange={(e) => setAccountSettings(prev => ({ ...prev, twoFactorEnabled: e.target.checked }))}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={updateAccountSettings}
                  disabled={loading}
                  className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(var(--color-primary-rgb),0.85)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save settings'}
                </button>
                <button
                  onClick={() => setShowAccountSettings(false)}
                  className="rounded-full border border-[rgba(var(--color-primary-rgb),0.25)] px-4 py-2 text-sm font-semibold text-primary transition hover:bg-soft-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCredentials;














