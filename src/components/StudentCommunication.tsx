import React, { useState } from 'react';
import Card from './Card';

interface StudentCommunicationProps {
  student: any;
  onClose: () => void;
}

const StudentCommunication: React.FC<StudentCommunicationProps> = ({ student, onClose }) => {
  const [activeTab, setActiveTab] = useState('messages');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const messageHistory = [
    {
      id: 'msg-1',
      date: '2025-10-20',
      type: 'email',
      subject: 'Assignment Reminder',
      content: 'Dear ' + student.fullName + ', please remember to submit your Quran recitation assignment by tomorrow.',
      status: 'sent',
      recipient: student.email
    },
    {
      id: 'msg-2',
      date: '2025-10-18',
      type: 'sms',
      content: 'Class reminder: Quran recitation class tomorrow at 9:00 AM.',
      status: 'delivered',
      recipient: student.contact
    },
    {
      id: 'msg-3',
      date: '2025-10-15',
      type: 'email',
      subject: 'Progress Update',
      content: 'Your child is making excellent progress in Islamic Studies. Keep up the great work!',
      status: 'sent',
      recipient: student.email
    },
    {
      id: 'msg-4',
      date: '2025-10-10',
      type: 'email',
      subject: 'Payment Reminder',
      content: 'Friendly reminder that your monthly tuition payment is due on October 15th.',
      status: 'sent',
      recipient: student.email
    }
  ];

  const messageTemplates = [
    {
      id: 'template-1',
      name: 'Welcome Message',
      subject: 'Welcome to Umar Academy',
      content: 'Dear {studentName}, welcome to Umar Academy! We are excited to have you join our learning community.'
    },
    {
      id: 'template-2',
      name: 'Assignment Reminder',
      subject: 'Assignment Due Soon',
      content: 'Dear {studentName}, this is a reminder that your {assignmentName} is due on {dueDate}.'
    },
    {
      id: 'template-3',
      name: 'Payment Reminder',
      subject: 'Payment Due',
      content: 'Dear {studentName}, your monthly tuition payment of ${amount} is due on {dueDate}.'
    },
    {
      id: 'template-4',
      name: 'Progress Update',
      subject: 'Progress Report',
      content: 'Dear {studentName}, your child is making excellent progress in {courseName}. Keep up the great work!'
    }
  ];

  const bulkMessageOptions = [
    { id: 'all-students', label: 'All Students', count: 150 },
    { id: 'by-teacher', label: 'By Teacher', count: 0 },
    { id: 'by-course', label: 'By Course', count: 0 },
    { id: 'by-grade', label: 'By Grade Level', count: 0 },
    { id: 'payment-overdue', label: 'Payment Overdue', count: 12 },
    { id: 'attendance-low', label: 'Low Attendance', count: 8 }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      sent: 'bg-blue-100 text-blue-800 border-blue-300',
      delivered: 'bg-green-100 text-green-800 border-green-300',
      failed: 'bg-red-100 text-red-800 border-red-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      email: '📧',
      sms: '📱',
      call: '📞',
      notification: '🔔'
    };
    return icons[type as keyof typeof icons] || '💬';
  };

  const tabs = [
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'templates', label: 'Templates', icon: '📝' },
    { id: 'bulk', label: 'Bulk Messages', icon: '📢' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Communication Center</h2>
              <p className="text-primary-100">{student.fullName} - {student.id}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowComposeModal(true)}
                className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
              >
                + Compose
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
              >
                📢 Bulk Message
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
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
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Message History</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                    + New Message
                  </button>
                  <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                    Filter
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {messageHistory.map((message) => (
                  <Card key={message.id}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                            <span className="text-primary-600 font-bold">{getTypeIcon(message.type)}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {message.subject || `${message.type.toUpperCase()} Message`}
                            </h4>
                            <p className="text-sm text-gray-600">
                              To: {message.recipient} • {new Date(message.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-gray-700 line-clamp-2">{message.content}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(message.status)}`}>
                            {message.status}
                          </span>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => setSelectedMessage(message)}
                              className="text-primary-600 hover:text-primary-800 text-sm"
                            >
                              View
                            </button>
                            <button className="text-gray-600 hover:text-gray-800 text-sm">
                              Resend
                            </button>
                            <button className="text-gray-600 hover:text-gray-800 text-sm">
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Message Templates</h3>
                <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                  + New Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {messageTemplates.map((template) => (
                  <Card key={template.id}>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      <div className="flex space-x-2">
                        <button className="text-primary-600 hover:text-primary-800 text-sm">Use</button>
                        <button className="text-gray-600 hover:text-gray-800 text-sm">Edit</button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Subject</label>
                        <p className="text-sm text-gray-900">{template.subject}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Content</label>
                        <p className="text-sm text-gray-700 line-clamp-3">{template.content}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bulk' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Bulk Messaging</h3>
                <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                  + Create Campaign
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bulkMessageOptions.map((option) => (
                  <Card key={option.id}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-900">{option.label}</h4>
                        <p className="text-sm text-gray-600">{option.count} recipients</p>
                      </div>
                      <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                        Select
                      </button>
                    </div>
                  </Card>
                ))}
              </div>

              <Card title="Recent Bulk Campaigns">
                <div className="space-y-3">
                  {[
                    { name: 'Payment Reminder Campaign', date: 'Oct 15, 2025', recipients: 45, status: 'completed' },
                    { name: 'Assignment Due Reminder', date: 'Oct 10, 2025', recipients: 32, status: 'completed' },
                    { name: 'Welcome New Students', date: 'Oct 5, 2025', recipients: 12, status: 'completed' }
                  ].map((campaign, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{campaign.name}</p>
                        <p className="text-sm text-gray-600">{campaign.recipients} recipients • {campaign.date}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                        <button className="text-primary-600 hover:text-primary-800 text-sm">View</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Communication Settings</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Notification Preferences">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-600">Send email notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">SMS Notifications</p>
                        <p className="text-sm text-gray-600">Send SMS notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Auto-reminders</p>
                        <p className="text-sm text-gray-600">Automatic payment reminders</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </Card>

                <Card title="Message Limits">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Daily Email Limit</span>
                      <span className="font-semibold text-gray-900">100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Daily SMS Limit</span>
                      <span className="font-semibold text-gray-900">50</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Monthly Usage</span>
                      <span className="font-semibold text-primary-600">1,250 / 2,000</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: '62.5%' }}></div>
                    </div>
                  </div>
                </Card>
              </div>

              <Card title="Integration Settings">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📧</span>
                      <div>
                        <p className="font-medium text-gray-900">Email Service</p>
                        <p className="text-sm text-gray-600">SMTP Configuration</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                      Configure
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📱</span>
                      <div>
                        <p className="font-medium text-gray-900">SMS Service</p>
                        <p className="text-sm text-gray-600">Twilio Integration</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                      Configure
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Compose Message Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Compose Message</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="notification">In-App Notification</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="">None</option>
                    <option value="welcome">Welcome Message</option>
                    <option value="reminder">Assignment Reminder</option>
                    <option value="payment">Payment Reminder</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  placeholder="Message subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
                <textarea
                  rows={6}
                  placeholder="Type your message here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Message Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Bulk Message Campaign</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g., Payment Reminder Campaign"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="all">All Students</option>
                    <option value="by-teacher">By Teacher</option>
                    <option value="by-course">By Course</option>
                    <option value="payment-overdue">Payment Overdue</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  placeholder="Campaign subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
                <textarea
                  rows={6}
                  placeholder="Type your bulk message here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                  Create Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">Message Details</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase">Subject</label>
                <p className="text-gray-900">{selectedMessage.subject || 'No Subject'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase">Recipient</label>
                <p className="text-gray-900">{selectedMessage.recipient}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase">Date</label>
                <p className="text-gray-900">{new Date(selectedMessage.date).toLocaleString()}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase">Status</label>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(selectedMessage.status)}`}>
                  {selectedMessage.status}
                </span>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase">Content</label>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{selectedMessage.content}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCommunication;









