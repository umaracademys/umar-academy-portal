import React, { useState, useEffect } from 'react';
import Card from './Card';
import { useData } from '../contexts/DataContext';

interface TeacherCredentialsProps {
  teacher: any;
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

const TeacherCredentials: React.FC<TeacherCredentialsProps> = ({ teacher, onClose }) => {
  const { updateTeacher } = useData();
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
  const [permissions, setPermissions] = useState(teacher?.permissions || {
    canViewAssessments: true,
    canEditAssessments: true,
    canViewEvaluations: true,
    canEditEvaluations: true,
    canViewFinancials: false,
    canManageSchedule: true,
    canContactParents: true,
    canViewStudentEmail: true,
    canViewStudentContact: true,
    canViewStudentPersonalInfo: true,
  });

  // Get user ID from teacher (could be userId or id or _id, or userId._id if populated)
  const getUserId = () => {
    if (teacher.userId) {
      // Handle both string and object (MongoDB populated) userId
      return typeof teacher.userId === 'object' && teacher.userId._id 
        ? teacher.userId._id 
        : teacher.userId;
    }
    // Fallback: try to find User by email if userId is not available
    // This will be handled in the fetchUserDetails function
    return null;
  };

  // Get user email for fallback lookup
  const getUserEmail = () => {
    return teacher.email || null;
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
        setError('User ID not found for this teacher. The teacher may not have a linked User account.');
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
            throw new Error('User not found. The teacher may not have a linked User account.');
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
  }, [teacher]);

  // Fetch login history when activity tab is active
  useEffect(() => {
    if (activeTab === 'activity') {
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
  }, [activeTab, teacher]);

  // Load permissions from teacher
  useEffect(() => {
    if (teacher?.permissions) {
      setPermissions(teacher.permissions);
    }
  }, [teacher]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const resetPassword = async () => {
    if (!newPassword) {
      setError('Please generate or enter a password');
      return;
    }
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
      alert(`✅ Password reset successfully for ${teacher.fullName || teacher.name || 'teacher'}`);
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
      setUserDetails(data);
      alert('✅ Account settings updated successfully!');
      setShowAccountSettings(false);
    } catch (err) {
      console.error('Error updating account settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update account settings');
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Failed to update account settings'}`);
    } finally {
      setLoading(false);
    }
  };

  const updatePermissions = async () => {
    if (!teacher?.id) {
      setError('Teacher ID not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await updateTeacher(teacher.id, { permissions });
      alert('✅ Permissions updated successfully!');
    } catch (err) {
      console.error('Error updating permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Failed to update permissions'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">👨‍🏫</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Teacher Credentials Management</h2>
                <p className="text-blue-100">
                  {teacher?.fullName ?? teacher?.name ?? teacher?.email ?? 'this teacher'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'security', label: 'Security', icon: '🔐' },
              { id: 'permissions', label: 'Permissions', icon: '🛡️' },
              { id: 'activity', label: 'Activity', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Card title="Teacher Account Overview">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Account Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Teacher ID:</span>
                        <span className="font-medium">{teacher?.id || teacher?._id || teacher?.teacherId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{teacher?.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">Teacher</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium px-2 py-1 rounded-full text-sm ${
                          userDetails?.accountStatus === 'active' || !userDetails
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {userDetails?.accountStatus === 'active' || !userDetails ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Login:</span>
                        <span className="font-medium">
                          {userDetails?.lastLogin 
                            ? new Date(userDetails.lastLogin).toLocaleString()
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Security Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Password Changed:</span>
                        <span className="font-medium">
                          {userDetails?.passwordChanged 
                            ? new Date(userDetails.passwordChanged).toLocaleDateString()
                            : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">2FA Enabled:</span>
                        <span className={`font-medium px-2 py-1 rounded-full text-sm ${
                          userDetails?.twoFactorEnabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {userDetails?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Email Verified:</span>
                        <span className={`font-medium px-2 py-1 rounded-full text-sm ${
                          userDetails?.emailVerified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {userDetails?.emailVerified ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Login Enabled:</span>
                        <span className={`font-medium px-2 py-1 rounded-full text-sm ${
                          userDetails?.loginEnabled !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {userDetails?.loginEnabled !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowPasswordReset(true)}
                  className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                >
                  <div className="text-2xl mb-2">🔑</div>
                  <h3 className="font-semibold mb-1">Reset Password</h3>
                  <p className="text-sm text-gray-600">Generate new password</p>
                </button>
                
                <button
                  onClick={() => setShowAccountSettings(true)}
                  className="p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
                >
                  <div className="text-2xl mb-2">⚙️</div>
                  <h3 className="font-semibold mb-1">Account Settings</h3>
                  <p className="text-sm text-gray-600">Manage preferences</p>
                </button>
                
                <button className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left">
                  <div className="text-2xl mb-2">📧</div>
                  <h3 className="font-semibold mb-1">Send Email</h3>
                  <p className="text-sm text-gray-600">Contact teacher</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card title="Security Management">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-red-800">Password Reset</h4>
                      <p className="text-sm text-red-600">Generate a new secure password for this teacher</p>
                    </div>
                    <button
                      onClick={() => setShowPasswordReset(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Reset Password
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-blue-800">Two-Factor Authentication</h4>
                      <p className="text-sm text-blue-600">Enable 2FA for enhanced security</p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                      Enable 2FA
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-yellow-800">Account Lock</h4>
                      <p className="text-sm text-yellow-600">Temporarily disable teacher access</p>
                    </div>
                    <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">
                      Lock Account
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <Card title="Teacher Permissions">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Academic Permissions</h4>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={permissions.canViewAssessments || false}
                          onChange={(e) => setPermissions({...permissions, canViewAssessments: e.target.checked})}
                          className="mr-3" 
                        />
                        <span>View Assessments</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={permissions.canEditAssessments || false}
                          onChange={(e) => setPermissions({...permissions, canEditAssessments: e.target.checked})}
                          className="mr-3" 
                        />
                        <span>Edit Assessments</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={permissions.canViewEvaluations || false}
                          onChange={(e) => setPermissions({...permissions, canViewEvaluations: e.target.checked})}
                          className="mr-3" 
                        />
                        <span>View Evaluations</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={permissions.canEditEvaluations || false}
                          onChange={(e) => setPermissions({...permissions, canEditEvaluations: e.target.checked})}
                          className="mr-3" 
                        />
                        <span>Edit Evaluations</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={permissions.canViewFinancials || false}
                          onChange={(e) => setPermissions({...permissions, canViewFinancials: e.target.checked})}
                          className="mr-3" 
                        />
                        <span>View Financials</span>
                      </label>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Communication & Access Permissions</h4>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={permissions.canManageSchedule || false}
                          onChange={(e) => setPermissions({...permissions, canManageSchedule: e.target.checked})}
                          className="mr-3" 
                        />
                        <span>Manage Schedule</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={permissions.canContactParents || false}
                          onChange={(e) => setPermissions({...permissions, canContactParents: e.target.checked})}
                          className="mr-3" 
                        />
                        <span>Contact Parents</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={permissions.canViewStudentEmail || false}
                          onChange={(e) => setPermissions({...permissions, canViewStudentEmail: e.target.checked})}
                          className="mr-3" 
                        />
                        <span>View Student Email</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={permissions.canViewStudentContact || false}
                          onChange={(e) => setPermissions({...permissions, canViewStudentContact: e.target.checked})}
                          className="mr-3" 
                        />
                        <span>View Student Contact</span>
                      </label>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={permissions.canViewStudentPersonalInfo || false}
                          onChange={(e) => setPermissions({...permissions, canViewStudentPersonalInfo: e.target.checked})}
                          className="mr-3" 
                        />
                        <span>View Student Personal Info</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <button 
                      onClick={updatePermissions}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Updating...' : 'Update Permissions'}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <Card title="Login History">
                {loading && loginHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Loading login history...</div>
                ) : loginHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No login history available</div>
                ) : (
                  <div className="space-y-3">
                    {loginHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">
                            {entry.status === 'success' && '✅'}
                            {entry.status === 'failure' && '❌'}
                            {entry.status === 'attempt' && '🔐'}
                          </span>
                          <div>
                            <span className="font-medium">
                              {entry.status === 'success' && 'Successful Login'}
                              {entry.status === 'failure' && 'Failed Login'}
                              {entry.status === 'attempt' && 'Login Attempt'}
                            </span>
                            <div className="text-xs text-gray-500">
                              {entry.ip} • {entry.location} • {entry.device}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(entry.date).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Password Reset Modal */}
        {showPasswordReset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Reset Teacher Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Generate or enter new password"
                    />
                    <button
                      onClick={generatePassword}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={resetPassword}
                    disabled={loading || !newPassword}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordReset(false);
                      setNewPassword('');
                      setError(null);
                    }}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={accountSettings.loginEnabled}
                      onChange={(e) => setAccountSettings({...accountSettings, loginEnabled: e.target.checked})}
                      className="mr-3"
                    />
                    <span>Enable Login</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={accountSettings.twoFactorEnabled}
                      onChange={(e) => setAccountSettings({...accountSettings, twoFactorEnabled: e.target.checked})}
                      className="mr-3"
                    />
                    <span>Two-Factor Authentication</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={accountSettings.emailNotifications}
                      onChange={(e) => setAccountSettings({...accountSettings, emailNotifications: e.target.checked})}
                      className="mr-3"
                    />
                    <span>Email Notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={accountSettings.smsNotifications}
                      onChange={(e) => setAccountSettings({...accountSettings, smsNotifications: e.target.checked})}
                      className="mr-3"
                    />
                    <span>SMS Notifications</span>
                  </label>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={updateAccountSettings}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAccountSettings(false);
                      setError(null);
                    }}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherCredentials;








