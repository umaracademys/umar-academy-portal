import React, { useState, useEffect } from 'react';
import Card from './Card';
import { useAuth } from '../contexts/AuthContext';
import LoginHistory from './LoginHistory';

interface SuperAdminProfileProps {
  onClose: () => void;
}

interface UserDetails {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  loginEnabled: boolean;
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  createdAt: string;
  updatedAt: string;
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

const SuperAdminProfile: React.FC<SuperAdminProfileProps> = ({ onClose }) => {
  const { user: currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Profile update form
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatar: ''
  });
  
  // Password update form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Account settings
  const [accountSettings, setAccountSettings] = useState({
    loginEnabled: true,
    twoFactorEnabled: false,
    emailNotifications: true,
    smsNotifications: false
  });

  // Fetch user details on mount
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!currentUser?.id) {
        setError('User information not available');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch all users and find current user
        const usersResponse = await fetch(`${API_BASE}/users`, {
          headers: getAuthHeaders()
        });
        
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch user details');
        }
        
        const users = await usersResponse.json();
        const user = users.find((u: any) => 
          u._id === currentUser.id || u.id === currentUser.id || u.email === currentUser.email
        );
        
        if (!user) {
          throw new Error('User not found');
        }
        
        setUserDetails(user);
        setProfileData({
          name: user.name || currentUser.name || '',
          email: user.email || currentUser.email || '',
          avatar: user.avatar || currentUser.avatar || ''
        });
        setAccountSettings({
          loginEnabled: user.loginEnabled !== false,
          twoFactorEnabled: user.twoFactorEnabled === true,
          emailNotifications: user.emailNotifications !== false,
          smsNotifications: user.smsNotifications === true
        });
      } catch (err) {
        console.error('Error fetching user details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [currentUser]);

  const updateProfile = async () => {
    if (!userDetails) {
      setError('User details not loaded');
      return;
    }

    if (!profileData.name || !profileData.email) {
      setError('Name and email are required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userId = userDetails._id || userDetails.id;
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          avatar: profileData.avatar
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      setUserDetails({ ...userDetails, ...data });
      
      // Update local storage user data
      const storedUser = localStorage.getItem('umar_academy_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        localStorage.setItem('umar_academy_user', JSON.stringify({
          ...user,
          name: data.name,
          email: data.email,
          avatar: data.avatar
        }));
      }
      
      alert('✅ Profile updated successfully!');
      window.location.reload(); // Reload to update header/profile info
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Failed to update profile'}`);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    if (!userDetails) {
      setError('User details not loaded');
      return;
    }

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userId = userDetails._id || userDetails.id;
      const response = await fetch(`${API_BASE}/users/${userId}/password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          password: passwordData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to update password');
      }

      alert('✅ Password updated successfully!');
      setShowPasswordUpdate(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Error updating password:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update password';
      setError(errorMessage);
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const updateAccountSettings = async () => {
    if (!userDetails) {
      setError('User details not loaded');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const userId = userDetails._id || userDetails.id;
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
      setUserDetails({ ...userDetails, ...data });
      alert('✅ Account settings updated successfully!');
    } catch (err) {
      console.error('Error updating account settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update account settings');
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Failed to update account settings'}`);
    } finally {
      setLoading(false);
    }
  };

  const generateAvatarUrl = (name: string) => {
    const encodedName = encodeURIComponent(name);
    return `https://ui-avatars.com/api/?name=${encodedName}&background=2E4D32&color=fff&size=128`;
  };

  if (loading && !userDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-primary font-semibold">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.9)] text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Super Admin Profile & Credentials</h2>
                <p className="text-white/90 text-sm">
                  {userDetails?.name || currentUser?.name || 'Super Admin'}
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

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-1 px-4">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'profile', label: 'Profile', icon: '👤' },
              { id: 'password', label: 'Password', icon: '🔒' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
              { id: 'history', label: 'Login History', icon: '📜' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-white'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && userDetails && (
            <div className="space-y-4">
              <Card>
                <div className="flex items-center space-x-4 p-4">
                  <img
                    src={userDetails.avatar || generateAvatarUrl(userDetails.name)}
                    alt={userDetails.name}
                    className="w-20 h-20 rounded-full border-2 border-primary"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{userDetails.name}</h3>
                    <p className="text-gray-600">{userDetails.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {userDetails.role}
                    </span>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <h4 className="font-semibold text-gray-700 mb-3">Account Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Login Enabled:</span>
                      <span className={`font-medium ${userDetails.loginEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {userDetails.loginEnabled ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Two-Factor Auth:</span>
                      <span className={`font-medium ${userDetails.twoFactorEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                        {userDetails.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h4 className="font-semibold text-gray-700 mb-3">Notifications</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className={`font-medium ${userDetails.emailNotifications ? 'text-green-600' : 'text-gray-600'}`}>
                        {userDetails.emailNotifications ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SMS:</span>
                      <span className={`font-medium ${userDetails.smsNotifications ? 'text-green-600' : 'text-gray-600'}`}>
                        {userDetails.smsNotifications ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Update Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      value={profileData.avatar}
                      onChange={(e) => setProfileData({ ...profileData, avatar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter avatar image URL"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to use auto-generated avatar
                    </p>
                  </div>

                  <button
                    onClick={updateProfile}
                    disabled={loading}
                    className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter new password (min 8 characters)"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 8 characters with uppercase, lowercase, number, and special character
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    onClick={updatePassword}
                    disabled={loading}
                    className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Account Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Login Enabled
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Allow login to this account
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accountSettings.loginEnabled}
                        onChange={(e) => setAccountSettings({ ...accountSettings, loginEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Two-Factor Authentication
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Add an extra layer of security
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accountSettings.twoFactorEnabled}
                        onChange={(e) => setAccountSettings({ ...accountSettings, twoFactorEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email Notifications
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Receive notifications via email
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accountSettings.emailNotifications}
                        onChange={(e) => setAccountSettings({ ...accountSettings, emailNotifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        SMS Notifications
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Receive notifications via SMS
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accountSettings.smsNotifications}
                        onChange={(e) => setAccountSettings({ ...accountSettings, smsNotifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <button
                    onClick={updateAccountSettings}
                    disabled={loading}
                    className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Save Settings'}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* Login History Tab */}
          {activeTab === 'history' && userDetails && (
            <div>
              <LoginHistory
                userId={userDetails._id || userDetails.id}
                userEmail={userDetails.email}
                userName={userDetails.name}
                showUserInfo={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminProfile;

