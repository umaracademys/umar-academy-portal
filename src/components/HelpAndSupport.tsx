import React, { useState } from 'react';
import Card from './Card';

interface HelpAndSupportProps {
  onClose: () => void;
}

const HelpAndSupport: React.FC<HelpAndSupportProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState('new-features');

  const sections = [
    { id: 'new-features', label: '🆕 New Features', icon: '✨' },
    { id: 'security', label: '🔒 Security', icon: '🛡️' },
    { id: 'profile', label: '👤 Profile Management', icon: '⚙️' },
    { id: 'troubleshooting', label: '🔧 Troubleshooting', icon: '💡' },
    { id: 'faq', label: '❓ FAQ', icon: '📚' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.9)] text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">❓</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Help & Support</h2>
                <p className="text-white/90 text-sm">Get help with features and troubleshooting</p>
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
          <div className="flex space-x-1 px-4 overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? 'text-primary border-b-2 border-primary bg-white'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* New Features Section */}
          {activeSection === 'new-features' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">🆕 Latest Updates</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <h4 className="font-semibold text-blue-900 mb-2">✨ Super Admin Profile & Credentials Management</h4>
                    <p className="text-blue-800 text-sm mb-2">
                      A new feature has been added to help you manage your own profile and credentials directly from the dashboard.
                    </p>
                    <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
                      <li>Update your profile information (name, email, avatar)</li>
                      <li>Change your password securely with current password verification</li>
                      <li>Manage account settings (login enabled, 2FA, notifications)</li>
                      <li>View your login history and security events</li>
                    </ul>
                    <p className="text-blue-700 text-xs mt-2">
                      <strong>How to access:</strong> Click "My Profile & Credentials" in the Quick Actions section on the dashboard.
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                    <h4 className="font-semibold text-green-900 mb-2">🔒 Enhanced Security Features</h4>
                    <p className="text-green-800 text-sm mb-2">
                      Comprehensive security improvements have been implemented to protect your account and data.
                    </p>
                    <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
                      <li>Strong password requirements (8+ chars, uppercase, lowercase, number, special char)</li>
                      <li>Account lockout protection (5 failed attempts = 30 min lockout)</li>
                      <li>Enhanced security headers (XSS protection, HTTPS enforcement)</li>
                      <li>Input validation and sanitization</li>
                      <li>Comprehensive security event logging</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">🔒 Password Security</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Password Requirements</h4>
                    <p className="text-gray-600 text-sm mb-2">All passwords must meet these criteria:</p>
                    <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                      <li>Minimum 8 characters</li>
                      <li>At least one uppercase letter (A-Z)</li>
                      <li>At least one lowercase letter (a-z)</li>
                      <li>At least one number (0-9)</li>
                      <li>At least one special character (!@#$%^&*...)</li>
                      <li>Cannot contain common weak passwords</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Account Lockout Protection</h4>
                    <p className="text-gray-600 text-sm">
                      After 5 failed login attempts, your account will be temporarily locked for 30 minutes. 
                      You'll see a countdown showing remaining attempts before lockout. The account automatically unlocks after the lockout period.
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">🛡️ Security Features</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">XSS Protection</h4>
                    <p className="text-gray-600 text-sm">Enhanced protection against cross-site scripting attacks through security headers.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">HTTPS Enforcement</h4>
                    <p className="text-gray-600 text-sm">Automatic redirect to secure connections for all communications.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Input Validation</h4>
                    <p className="text-gray-600 text-sm">All user inputs are automatically sanitized to prevent injection attacks.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Security Monitoring</h4>
                    <p className="text-gray-600 text-sm">All security events (login attempts, password changes, etc.) are logged for auditing.</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Profile Management Section */}
          {activeSection === 'profile' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">👤 Profile Management</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">How to Access</h4>
                    <ol className="list-decimal list-inside text-gray-600 text-sm space-y-1 ml-4">
                      <li>Log in as Super Admin</li>
                      <li>Navigate to the Super Admin Dashboard</li>
                      <li>Click on "My Profile & Credentials" in the Quick Actions section</li>
                      <li>A modal will open with your profile management interface</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Available Features</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">📊 Overview Tab</h5>
                        <p className="text-gray-600 text-sm">View your account summary, status, and notification preferences.</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">👤 Profile Tab</h5>
                        <p className="text-gray-600 text-sm">Update your full name, email address, and avatar URL.</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">🔒 Password Tab</h5>
                        <p className="text-gray-600 text-sm">Change your password securely. Requires current password verification.</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">⚙️ Settings Tab</h5>
                        <p className="text-gray-600 text-sm">Manage account preferences (login enabled, 2FA, email/SMS notifications).</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800 mb-1">📜 Login History Tab</h5>
                        <p className="text-gray-600 text-sm">View all login attempts, IP addresses, devices, and security events.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Troubleshooting Section */}
          {activeSection === 'troubleshooting' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">🔧 Password Issues</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <h4 className="font-semibold text-yellow-900 mb-1">"Password does not meet security requirements"</h4>
                    <p className="text-yellow-800 text-sm">
                      Ensure your password has at least 8 characters with uppercase, lowercase, number, and special character.
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <h4 className="font-semibold text-yellow-900 mb-1">"Current password is incorrect"</h4>
                    <p className="text-yellow-800 text-sm">
                      Double-check you're entering the correct current password. Make sure Caps Lock is not enabled.
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                    <h4 className="font-semibold text-red-900 mb-1">"Account is temporarily locked"</h4>
                    <p className="text-red-800 text-sm">
                      Wait 30 minutes for automatic unlock. The lockout message will show remaining time. Contact an administrator if you need immediate access.
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">🔧 Profile Update Issues</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <h4 className="font-semibold text-yellow-900 mb-1">"Invalid email format"</h4>
                    <p className="text-yellow-800 text-sm">Ensure your email follows the format: name@domain.com</p>
                  </div>
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <h4 className="font-semibold text-yellow-900 mb-1">"Access denied" when updating profile</h4>
                    <p className="text-yellow-800 text-sm">Make sure you're logged in as Super Admin. Try refreshing the page or clearing browser cache.</p>
                  </div>
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <h4 className="font-semibold text-yellow-900 mb-1">Changes not saving</h4>
                    <p className="text-yellow-800 text-sm">Check that all required fields are filled. Ensure you have a stable internet connection.</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* FAQ Section */}
          {activeSection === 'faq' && (
            <div className="space-y-4">
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4">❓ Frequently Asked Questions</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Q: How do I change my password?</h4>
                    <p className="text-gray-600 text-sm">
                      A: Click "My Profile & Credentials" → Password tab → Enter current password → Enter new password (must meet requirements) → Confirm → Update Password.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Q: What if I forget my password?</h4>
                    <p className="text-gray-600 text-sm">
                      A: Contact a system administrator. They can reset your password for you.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Q: Why is my account locked?</h4>
                    <p className="text-gray-600 text-sm">
                      A: Your account is locked after 5 failed login attempts. Wait 30 minutes for automatic unlock, or contact an administrator.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Q: Can I change my email address?</h4>
                    <p className="text-gray-600 text-sm">
                      A: Yes, go to Profile tab → Update email → Save. Make sure the email is valid and not already in use.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Q: Where can I see my login history?</h4>
                    <p className="text-gray-600 text-sm">
                      A: Click "My Profile & Credentials" → Login History tab. You'll see all login attempts, IP addresses, and devices.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Q: What are the password requirements?</h4>
                    <p className="text-gray-600 text-sm">
                      A: Minimum 8 characters with at least one uppercase letter, one lowercase letter, one number, and one special character.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpAndSupport;

