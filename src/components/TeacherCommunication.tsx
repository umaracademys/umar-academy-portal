import React, { useState } from 'react';
import Card from './Card';

interface TeacherCommunicationProps {
  teacher: any;
  onClose: () => void;
}

const TeacherCommunication: React.FC<TeacherCommunicationProps> = ({ teacher, onClose }) => {
  const [activeTab, setActiveTab] = useState('messages');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const messageHistory = [
    {
      id: 'msg-1',
      type: 'email',
      subject: 'Weekly Schedule Update',
      content: 'Please find attached the updated schedule for next week. There are some changes to the Friday classes.',
      recipient: teacher.email,
      date: '2025-10-20T10:30:00Z',
      status: 'sent',
      priority: 'normal'
    },
    {
      id: 'msg-2',
      type: 'sms',
      subject: 'Class Reminder',
      content: 'Reminder: You have a Quran Recitation class at 9:00 AM tomorrow.',
      recipient: teacher.contact,
      date: '2025-10-19T18:00:00Z',
      status: 'delivered',
      priority: 'high'
    },
    {
      id: 'msg-3',
      type: 'email',
      subject: 'Performance Review Meeting',
      content: 'We would like to schedule a performance review meeting for next week. Please let us know your availability.',
      recipient: teacher.email,
      date: '2025-10-18T14:15:00Z',
      status: 'read',
      priority: 'normal'
    },
    {
      id: 'msg-4',
      type: 'notification',
      subject: 'New Student Assignment',
      content: 'A new student has been assigned to your Islamic Studies class. Please check the student portal for details.',
      recipient: 'Portal Notification',
      date: '2025-10-17T09:00:00Z',
      status: 'read',
      priority: 'normal'
    }
  ];

  const messageTemplates = [
    {
      id: 'template-1',
      name: 'Class Reminder',
      type: 'sms',
      subject: 'Class Reminder',
      content: 'Reminder: You have a {course} class at {time} tomorrow. Please be on time.',
      variables: ['course', 'time']
    },
    {
      id: 'template-2',
      name: 'Schedule Change',
      type: 'email',
      subject: 'Schedule Change Notification',
      content: 'Dear {teacher_name},\n\nThere has been a change in your schedule for {date}. Please review the updated timetable.\n\nBest regards,\nAdmin Team',
      variables: ['teacher_name', 'date']
    },
    {
      id: 'template-3',
      name: 'Performance Review',
      type: 'email',
      subject: 'Performance Review Meeting',
      content: 'Dear {teacher_name},\n\nWe would like to schedule a performance review meeting. Please let us know your availability for next week.\n\nBest regards,\nAdmin Team',
      variables: ['teacher_name']
    },
    {
      id: 'template-4',
      name: 'Welcome Message',
      type: 'email',
      subject: 'Welcome to Umar Academy',
      content: 'Dear {teacher_name},\n\nWelcome to Umar Academy! We are excited to have you join our team. Please check your email for login credentials and initial setup instructions.\n\nBest regards,\nAdmin Team',
      variables: ['teacher_name']
    }
  ];

  const communicationSettings = {
    emailNotifications: true,
    smsNotifications: true,
    portalNotifications: true,
    weeklyDigest: true,
    performanceAlerts: true,
    scheduleChanges: true,
    studentUpdates: true,
    systemMaintenance: false
  };

  const getMessageTypeIcon = (type: string) => {
    const icons = {
      email: '📧',
      sms: '📱',
      notification: '🔔',
      call: '📞'
    };
    return icons[type as keyof typeof icons] || '📧';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      sent: 'bg-blue-100 text-blue-800 border-blue-300',
      delivered: 'bg-green-100 text-green-800 border-green-300',
      read: 'bg-purple-100 text-purple-800 border-purple-300',
      failed: 'bg-red-100 text-red-800 border-red-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-500',
      normal: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const tabs = [
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'templates', label: 'Templates', icon: '📝' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'analytics', label: 'Analytics', icon: '📊' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Communication Center</h2>
              <p className="text-primary-100">{teacher.fullName} - {teacher.id}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowComposeModal(true)}
                className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
              >
                + Compose
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
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <span className="text-primary-600 font-bold text-xl">{getMessageTypeIcon(message.type)}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{message.subject}</h4>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(message.status)}`}>
                              {message.status}
                            </span>
                            <span className={`text-xs font-semibold ${getPriorityColor(message.priority)}`}>
                              {message.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{message.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>To: {message.recipient}</span>
                            <span>•</span>
                            <span>{new Date(message.date).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setSelectedMessage(message)}
                          className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition"
                        >
                          View
                        </button>
                        <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                          Reply
                        </button>
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
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition"
                >
                  + New Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {messageTemplates.map((template) => (
                  <Card key={template.id}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                            {template.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{template.subject}</p>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.content}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Variables:</span>
                          {template.variables.map((variable, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {variable}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                          Use
                        </button>
                        <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                          Edit
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Communication Settings</h3>
              
              <Card title="Notification Preferences">
                <div className="space-y-4">
                  {Object.entries(communicationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {key === 'emailNotifications' && 'Receive email notifications'}
                          {key === 'smsNotifications' && 'Receive SMS notifications'}
                          {key === 'portalNotifications' && 'Receive portal notifications'}
                          {key === 'weeklyDigest' && 'Receive weekly summary emails'}
                          {key === 'performanceAlerts' && 'Get alerts about performance issues'}
                          {key === 'scheduleChanges' && 'Get notified about schedule changes'}
                          {key === 'studentUpdates' && 'Get notified about student updates'}
                          {key === 'systemMaintenance' && 'Get notified about system maintenance'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Contact Information">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={teacher.email}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={teacher.contact}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Contact Method</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Communication Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Total Messages</p>
                    <p className="text-2xl font-bold text-primary-600">24</p>
                    <p className="text-xs text-gray-500 mt-1">This month</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Email Sent</p>
                    <p className="text-2xl font-bold text-blue-600">18</p>
                    <p className="text-xs text-gray-500 mt-1">75% of total</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">SMS Sent</p>
                    <p className="text-2xl font-bold text-green-600">6</p>
                    <p className="text-xs text-gray-500 mt-1">25% of total</p>
                  </div>
                </Card>
                <Card>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Response Rate</p>
                    <p className="text-2xl font-bold text-gold-600">92%</p>
                    <p className="text-xs text-gray-500 mt-1">Average</p>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Message Types">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Email</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                        <span className="text-sm font-semibold">75%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">SMS</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                        </div>
                        <span className="text-sm font-semibold">25%</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Recent Activity">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Last Email Sent</span>
                      <span className="font-semibold">2 hours ago</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Last SMS Sent</span>
                      <span className="font-semibold">1 day ago</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Templates Used</span>
                      <span className="font-semibold">8 this month</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Compose Message</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="notification">Portal Notification</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
                <input
                  type="text"
                  value={teacher.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  placeholder="Enter message subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  rows={6}
                  placeholder="Enter your message here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
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

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Template</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                <input
                  type="text"
                  placeholder="Enter template name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="notification">Portal Notification</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  placeholder="Enter subject template"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message Template</label>
                <textarea
                  rows={6}
                  placeholder="Enter message template. Use {variable_name} for dynamic content."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Variables (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., teacher_name, course, time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                  Create Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherCommunication;












