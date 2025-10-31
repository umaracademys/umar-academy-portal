import React, { useState } from 'react';
import Card from './Card';

interface TeacherBulkOperationsProps {
  onClose: () => void;
}

const TeacherBulkOperations: React.FC<TeacherBulkOperationsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('import');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const tabs = [
    { id: 'import', label: 'Import Teachers', icon: '📥' },
    { id: 'export', label: 'Export Teachers', icon: '📤' },
    { id: 'bulk-actions', label: 'Bulk Actions', icon: '⚡' },
    { id: 'templates', label: 'Templates', icon: '📋' }
  ];

  const sampleTeachers = [
    { id: '1', name: 'Dr. Ahmad Hassan', email: 'ahmad@umaracademy.org', subject: 'Quran Recitation', status: 'active' },
    { id: '2', name: 'Ustadh Ibrahim Yusuf', email: 'ibrahim@umaracademy.org', subject: 'Islamic Studies', status: 'active' },
    { id: '3', name: 'Ustadha Fatima Ali', email: 'fatima@umaracademy.org', subject: 'Arabic Language', status: 'inactive' },
    { id: '4', name: 'Dr. Omar Khan', email: 'omar@umaracademy.org', subject: 'Tajweed Rules', status: 'active' }
  ];

  const handleTeacherSelect = (teacherId: string) => {
    setSelectedTeachers(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTeachers.length === sampleTeachers.length) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers(sampleTeachers.map(t => t.id));
    }
  };

  const handleBulkAction = (action: string) => {
    setBulkAction(action);
    setShowConfirmModal(true);
  };

  const confirmBulkAction = () => {
    alert(`Bulk action "${bulkAction}" applied to ${selectedTeachers.length} teachers!`);
    setShowConfirmModal(false);
    setBulkAction('');
    setSelectedTeachers([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Teacher Bulk Operations</h2>
                <p className="text-green-100">Import, export, and manage multiple teachers</p>
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
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
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
          {activeTab === 'import' && (
            <div className="space-y-6">
              <Card title="Import Teachers from File">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-4">📁</div>
                    <h3 className="text-lg font-semibold mb-2">Upload Teacher Data</h3>
                    <p className="text-gray-600 mb-4">Upload CSV or Excel file with teacher information</p>
                    <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                      Choose File
                    </button>
                    <p className="text-sm text-gray-500 mt-2">Supported formats: CSV, XLSX</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold mb-2">📋 Required Fields</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Full Name</li>
                        <li>• Email Address</li>
                        <li>• Phone Number</li>
                        <li>• Subject/Department</li>
                        <li>• Qualification</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold mb-2">✅ Optional Fields</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Address</li>
                        <li>• Experience Years</li>
                        <li>• Specialization</li>
                        <li>• Availability</li>
                        <li>• Notes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Import Preview">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Sample Data Preview</h4>
                    <span className="text-sm text-gray-500">4 teachers ready to import</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Subject</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleTeachers.slice(0, 3).map((teacher) => (
                          <tr key={teacher.id} className="border-b">
                            <td className="px-3 py-2">{teacher.name}</td>
                            <td className="px-3 py-2">{teacher.email}</td>
                            <td className="px-3 py-2">{teacher.subject}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                teacher.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {teacher.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                      Import All Teachers
                    </button>
                    <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
                      Cancel Import
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <Card title="Export Teacher Data">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
                      <div className="text-2xl mb-2">📊</div>
                      <h3 className="font-semibold mb-1">Export All Teachers</h3>
                      <p className="text-sm text-gray-600">Complete teacher database</p>
                    </button>
                    
                    <button className="p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left">
                      <div className="text-2xl mb-2">📋</div>
                      <h3 className="font-semibold mb-1">Export Selected Teachers</h3>
                      <p className="text-sm text-gray-600">Only selected teachers</p>
                    </button>
                    
                    <button className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left">
                      <div className="text-2xl mb-2">📈</div>
                      <h3 className="font-semibold mb-1">Performance Report</h3>
                      <p className="text-sm text-gray-600">Teacher performance data</p>
                    </button>
                    
                    <button className="p-4 border-2 border-yellow-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition text-left">
                      <div className="text-2xl mb-2">💰</div>
                      <h3 className="font-semibold mb-1">Payroll Report</h3>
                      <p className="text-sm text-gray-600">Salary and payment data</p>
                    </button>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Export Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-2" />
                        <span>CSV Format</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span>Excel Format</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span>PDF Report</span>
                      </label>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'bulk-actions' && (
            <div className="space-y-6">
              <Card title="Select Teachers for Bulk Actions">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleSelectAll}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        {selectedTeachers.length === sampleTeachers.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="text-sm text-gray-600">
                        {selectedTeachers.length} of {sampleTeachers.length} teachers selected
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {sampleTeachers.map((teacher) => (
                      <div key={teacher.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedTeachers.includes(teacher.id)}
                            onChange={() => handleTeacherSelect(teacher.id)}
                            className="w-4 h-4"
                          />
                          <div>
                            <div className="font-medium">{teacher.name}</div>
                            <div className="text-sm text-gray-600">{teacher.email} • {teacher.subject}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          teacher.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {teacher.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title="Bulk Actions">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleBulkAction('Activate Accounts')}
                    className="p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left"
                  >
                    <div className="text-2xl mb-2">✅</div>
                    <h3 className="font-semibold mb-1">Activate Accounts</h3>
                    <p className="text-sm text-gray-600">Enable selected teacher accounts</p>
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('Deactivate Accounts')}
                    className="p-4 border-2 border-red-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition text-left"
                  >
                    <div className="text-2xl mb-2">❌</div>
                    <h3 className="font-semibold mb-1">Deactivate Accounts</h3>
                    <p className="text-sm text-gray-600">Disable selected teacher accounts</p>
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('Send Welcome Email')}
                    className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                  >
                    <div className="text-2xl mb-2">📧</div>
                    <h3 className="font-semibold mb-1">Send Welcome Email</h3>
                    <p className="text-sm text-gray-600">Send welcome message to teachers</p>
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('Reset Passwords')}
                    className="p-4 border-2 border-yellow-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition text-left"
                  >
                    <div className="text-2xl mb-2">🔑</div>
                    <h3 className="font-semibold mb-1">Reset Passwords</h3>
                    <p className="text-sm text-gray-600">Generate new passwords</p>
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('Assign Subjects')}
                    className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left"
                  >
                    <div className="text-2xl mb-2">📚</div>
                    <h3 className="font-semibold mb-1">Assign Subjects</h3>
                    <p className="text-sm text-gray-600">Bulk assign subjects</p>
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('Delete Teachers')}
                    className="p-4 border-2 border-red-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition text-left"
                  >
                    <div className="text-2xl mb-2">🗑️</div>
                    <h3 className="font-semibold mb-1">Delete Teachers</h3>
                    <p className="text-sm text-gray-600">Remove selected teachers</p>
                  </button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <Card title="Download Templates">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
                      <div className="text-2xl mb-2">📋</div>
                      <h3 className="font-semibold mb-1">Teacher Import Template</h3>
                      <p className="text-sm text-gray-600">CSV template for importing teachers</p>
                      <div className="mt-2">
                        <span className="text-blue-600 text-sm">Download CSV</span>
                      </div>
                    </button>
                    
                    <button className="p-4 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-left">
                      <div className="text-2xl mb-2">📊</div>
                      <h3 className="font-semibold mb-1">Excel Template</h3>
                      <p className="text-sm text-gray-600">Excel template with formulas</p>
                      <div className="mt-2">
                        <span className="text-green-600 text-sm">Download XLSX</span>
                      </div>
                    </button>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Template Instructions</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p>• Download the template file</p>
                      <p>• Fill in teacher information following the format</p>
                      <p>• Save as CSV or Excel format</p>
                      <p>• Upload using the Import tab</p>
                      <p>• Review and confirm the import</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Confirm Bulk Action</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to <strong>{bulkAction}</strong> for {selectedTeachers.length} selected teachers?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={confirmBulkAction}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Confirm Action
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherBulkOperations;








