import React, { useState } from 'react';
import Card from './Card';

interface StudentBulkOperationsProps {
  onClose: () => void;
}

const StudentBulkOperations: React.FC<StudentBulkOperationsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('import');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const tabs = [
    { id: 'import', label: 'Import Students', icon: '📥' },
    { id: 'export', label: 'Export Students', icon: '📤' },
    { id: 'bulk-actions', label: 'Bulk Actions', icon: '⚡' },
    { id: 'templates', label: 'Templates', icon: '📋' }
  ];

  const sampleStudents = [
    { id: '1', name: 'Ahmed Hassan', email: 'ahmed@example.com', status: 'active' },
    { id: '2', name: 'Fatima Khan', email: 'fatima@example.com', status: 'active' },
    { id: '3', name: 'Omar Ali', email: 'omar@example.com', status: 'inactive' },
    { id: '4', name: 'Aisha Ahmed', email: 'aisha@example.com', status: 'active' }
  ];

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleBulkAction = () => {
    if (bulkAction && selectedStudents.length > 0) {
      setShowConfirmModal(true);
    }
  };

  const executeBulkAction = () => {
    // In a real app, this would execute the bulk action
    alert(`Executing ${bulkAction} for ${selectedStudents.length} students`);
    setShowConfirmModal(false);
    setBulkAction('');
    setSelectedStudents([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Student Bulk Operations</h2>
            <p className="text-gray-600">Manage multiple students at once</p>
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
          {activeTab === 'import' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Students</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">Drag and drop your CSV file here, or click to browse</p>
                      <button className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                        Choose File
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">File Format</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option>CSV (Comma Separated Values)</option>
                        <option>Excel (.xlsx)</option>
                        <option>JSON</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Update Existing</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option>Skip existing students</option>
                        <option>Update existing students</option>
                        <option>Replace all data</option>
                      </select>
                    </div>
                  </div>
                  
                  <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                    Start Import
                  </button>
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Template</h3>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Download our template to ensure proper formatting:</p>
                  <div className="flex space-x-3">
                    <button className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition">
                      📄 Download CSV Template
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                      📊 Download Excel Template
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Students</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option>CSV (Comma Separated Values)</option>
                        <option>Excel (.xlsx)</option>
                        <option>PDF Report</option>
                        <option>JSON</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option>All students</option>
                        <option>Last 30 days</option>
                        <option>Last 3 months</option>
                        <option>Last year</option>
                        <option>Custom range</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Include Fields</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm">Personal Info</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm">Contact Details</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm">Academic Info</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">Payment History</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">Attendance</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">Progress</span>
                      </label>
                    </div>
                  </div>
                  
                  <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                    Export Students
                  </button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'bulk-actions' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Students</h3>
                <div className="space-y-3">
                  {sampleStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleStudentSelect(student.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-600">{student.email}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {student.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Actions</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Action</label>
                    <select 
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Choose an action...</option>
                      <option value="activate">Activate Accounts</option>
                      <option value="deactivate">Deactivate Accounts</option>
                      <option value="send-email">Send Email</option>
                      <option value="send-sms">Send SMS</option>
                      <option value="assign-teacher">Assign Teacher</option>
                      <option value="change-program">Change Program</option>
                      <option value="reset-password">Reset Passwords</option>
                      <option value="export-selected">Export Selected</option>
                    </select>
                  </div>
                  
                  {bulkAction && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Action Details</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={3}
                        placeholder="Enter additional details for this action..."
                      />
                    </div>
                  )}
                  
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction || selectedStudents.length === 0}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Execute Action ({selectedStudents.length} students selected)
                  </button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pre-built Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Student Registration</h4>
                    <p className="text-sm text-gray-600 mb-3">Template for bulk student registration</p>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                      Use Template
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Parent Communication</h4>
                    <p className="text-sm text-gray-600 mb-3">Template for parent notifications</p>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                      Use Template
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Payment Reminder</h4>
                    <p className="text-sm text-gray-600 mb-3">Template for payment reminders</p>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                      Use Template
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Progress Report</h4>
                    <p className="text-sm text-gray-600 mb-3">Template for progress reports</p>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                      Use Template
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Bulk Action</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to execute "{bulkAction}" for {selectedStudents.length} selected students?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={executeBulkAction}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentBulkOperations;














