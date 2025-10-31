import React, { useState } from 'react';
import Card from './Card';

interface TeacherCredentialsProps {
  teacher: any;
  onClose: () => void;
}

const TeacherCredentials: React.FC<TeacherCredentialsProps> = ({ teacher, onClose }) => {
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
    // Password reset logic here
    alert('Password reset email sent to teacher!');
    setShowPasswordReset(false);
  };

  const updateAccountSettings = () => {
    // Update account settings logic here
    alert('Account settings updated successfully!');
    setShowAccountSettings(false);
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
                <p className="text-blue-100">{teacher?.name || 'Selected Teacher'}</p>
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
                        <span className="font-medium">{teacher?.id || 'T-001'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{teacher?.email || 'teacher@umaracademy.org'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">Teacher</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Login:</span>
                        <span className="font-medium">2 hours ago</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Security Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Password Strength:</span>
                        <span className="font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">Strong</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">2FA Enabled:</span>
                        <span className="font-medium bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">Disabled</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Login Attempts:</span>
                        <span className="font-medium">3 (Last 24h)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Account Locked:</span>
                        <span className="font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">No</span>
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
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span>Create Assignments</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span>Grade Students</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span>View Student Progress</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span>Access Gradebook</span>
                      </label>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Communication Permissions</h4>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span>Send Messages</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span>Email Students</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span>Parent Communication</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-3" />
                        <span>Announcements</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                      Update Permissions
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <Card title="Recent Activity">
                <div className="space-y-3">
                  {[
                    { action: 'Logged in', time: '2 hours ago', type: 'login' },
                    { action: 'Created assignment', time: '4 hours ago', type: 'assignment' },
                    { action: 'Graded 15 students', time: '6 hours ago', type: 'grading' },
                    { action: 'Sent message to parent', time: '1 day ago', type: 'communication' },
                    { action: 'Updated profile', time: '2 days ago', type: 'profile' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {activity.type === 'login' && '🔐'}
                          {activity.type === 'assignment' && '📝'}
                          {activity.type === 'grading' && '📊'}
                          {activity.type === 'communication' && '💬'}
                          {activity.type === 'profile' && '👤'}
                        </span>
                        <span className="font-medium">{activity.action}</span>
                      </div>
                      <span className="text-sm text-gray-500">{activity.time}</span>
                    </div>
                  ))}
                </div>
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
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => setShowPasswordReset(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Save Settings
                  </button>
                  <button
                    onClick={() => setShowAccountSettings(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
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








