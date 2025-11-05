import React, { useState } from 'react';
import Card from './Card';

interface StudentCredentialsProps {
  student: any;
  onClose: () => void;
}

const StudentCredentials: React.FC<StudentCredentialsProps> = ({ student, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [accountSettings, setAccountSettings] = useState({
    loginEnabled: true,
    twoFactorEnabled: false,
    emailNotifications: true,
    smsNotifications: false,
    securityQuestions: [
      { question: 'What is your mother\'s maiden name?', answer: '' },
      { question: 'What was the name of your first pet?', answer: '' },
      { question: 'What city were you born in?', answer: '' }
    ]
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const resetPassword = () => {
    if (newPassword) {
      // In a real app, this would update the student's password
      alert(`Password reset to: ${newPassword}`);
      setShowPasswordReset(false);
      setNewPassword('');
    }
  };

  const updateAccountSettings = () => {
    // In a real app, this would update the student's account settings
    alert('Account settings updated successfully');
    setShowAccountSettings(false);
  };

  const tabs = [
    { id: 'overview', label: 'Credentials Overview', icon: '🔐' },
    { id: 'security', label: 'Security Settings', icon: '🛡️' },
    { id: 'access', label: 'Access Control', icon: '🚪' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'history', label: 'Login History', icon: '📊' }
  ];

  const loginHistory = [
    {
      id: 'login-1',
      date: '2025-01-20 09:15:30',
      ip: '192.168.1.100',
      location: 'New York, NY',
      device: 'Chrome on Windows',
      status: 'success'
    },
    {
      id: 'login-2',
      date: '2025-01-19 14:22:15',
      ip: '192.168.1.100',
      location: 'New York, NY',
      device: 'Chrome on Windows',
      status: 'success'
    },
    {
      id: 'login-3',
      date: '2025-01-18 16:45:22',
      ip: '192.168.1.100',
      location: 'New York, NY',
      device: 'Mobile Safari',
      status: 'success'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <img src={student.avatar} alt={student.fullName} className="h-12 w-12 rounded-full" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Student Credentials</h2>
              <p className="text-gray-600">{student.fullName} - {student.email}</p>
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
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Status:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Active
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Login Enabled:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        Yes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Login:</span>
                      <span className="text-gray-900">2025-01-20 09:15:30</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Password Changed:</span>
                      <span className="text-gray-900">2025-01-15 14:30:00</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Features</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Two-Factor Auth:</span>
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                        Disabled
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Security Questions:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Set
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email Verified:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Yes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone Verified:</span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        Pending
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPasswordReset(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Reset Password
                </button>
                <button
                  onClick={() => setShowAccountSettings(true)}
                  className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
                >
                  Account Settings
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                  Generate Report
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
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                      Enable
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Email Authentication</p>
                      <p className="text-sm text-gray-600">Receive verification codes via email</p>
                    </div>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                      Enable
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
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
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
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">SMS Notifications</p>
                      <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Push Notifications</p>
                      <p className="text-sm text-gray-600">Receive push notifications on mobile</p>
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
                      {loginHistory.map((login) => (
                        <tr key={login.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{login.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{login.ip}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{login.location}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{login.device}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              {login.status}
                            </span>
                          </td>
                        </tr>
                      ))}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reset Password</h3>
            <p className="text-gray-600 mb-4">Generate a new password for {student.fullName}</p>
            
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
                    className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
                  >
                    Generate
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={resetPassword}
                  disabled={!newPassword}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset Password
                </button>
                <button
                  onClick={() => setShowPasswordReset(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Account Settings</h3>
            
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
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Save Settings
                </button>
                <button
                  onClick={() => setShowAccountSettings(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
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










