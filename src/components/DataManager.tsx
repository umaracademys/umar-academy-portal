import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import Card from './Card';

interface DataManagerProps {
  onClose: () => void;
}

const DataManager: React.FC<DataManagerProps> = ({ onClose }) => {
  const { students, teachers, admins } = useData();
  const [activeTab, setActiveTab] = useState('export');
  const [selectedData, setSelectedData] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('csv');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  const dataTypes = [
    { id: 'students', label: 'Students', count: students.length, icon: '👨‍🎓' },
    { id: 'teachers', label: 'Teachers', count: teachers.length, icon: '👨‍🏫' },
    { id: 'admins', label: 'Admins', count: admins.length, icon: '🛡️' },
    { id: 'all', label: 'All Data', count: students.length + teachers.length + admins.length, icon: '📊' }
  ];

  const exportFormats = [
    { id: 'csv', label: 'CSV', description: 'Comma-separated values' },
    { id: 'excel', label: 'Excel', description: 'Microsoft Excel format' },
    { id: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
    { id: 'pdf', label: 'PDF', description: 'Portable Document Format' }
  ];

  const handleDataSelection = (dataId: string) => {
    if (dataId === 'all') {
      setSelectedData(['students', 'teachers', 'admins']);
    } else {
      setSelectedData(prev => 
        prev.includes(dataId) 
          ? prev.filter(id => id !== dataId)
          : [...prev, dataId]
      );
    }
  };

  const handleExport = () => {
    if (selectedData.length === 0) {
      alert('Please select at least one data type to export');
      return;
    }

    // Simulate export process
    setImportProgress(0);
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          alert(`Export completed! ${selectedData.length} data type(s) exported as ${exportFormat.toUpperCase()}`);
          return 0;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImport = () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    // Simulate import process
    setImportProgress(0);
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          alert(`Import completed! ${importFile.name} processed successfully`);
          setImportFile(null);
          return 0;
        }
        return prev + 5;
      });
    }, 100);
  };

  const generateSampleData = () => {
    const sampleStudents = [
      {
        fullName: 'Ahmad Ali',
        email: 'ahmad.ali@example.com',
        contact: '+1-555-0101',
        program: 'Quran Recitation',
        tuitionFee: 500,
        status: 'active'
      },
      {
        fullName: 'Fatima Hassan',
        email: 'fatima.hassan@example.com',
        contact: '+1-555-0102',
        program: 'Islamic Studies',
        tuitionFee: 400,
        status: 'active'
      }
    ];

    const csvContent = [
      'Full Name,Email,Contact,Program,Tuition Fee,Status',
      ...sampleStudents.map(student => 
        `${student.fullName},${student.email},${student.contact},${student.program},${student.tuitionFee},${student.status}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'export', label: 'Export Data', icon: '📤' },
    { id: 'import', label: 'Import Data', icon: '📥' },
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Data Management Center</h2>
              <p className="text-primary-100">Import, export, and manage academy data</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Close
            </button>
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
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
                <button
                  onClick={handleExport}
                  disabled={selectedData.length === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export Selected
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Select Data Types">
                  <div className="space-y-3">
                    {dataTypes.map((dataType) => (
                      <label key={dataType.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedData.includes(dataType.id) || (dataType.id === 'all' && selectedData.length === 3)}
                          onChange={() => handleDataSelection(dataType.id)}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                        />
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{dataType.icon}</span>
                          <div>
                            <p className="font-medium text-gray-900">{dataType.label}</p>
                            <p className="text-sm text-gray-600">{dataType.count} records</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </Card>

                <Card title="Export Format">
                  <div className="space-y-3">
                    {exportFormats.map((format) => (
                      <label key={format.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="exportFormat"
                          value={format.id}
                          checked={exportFormat === format.id}
                          onChange={(e) => setExportFormat(e.target.value)}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{format.label}</p>
                          <p className="text-sm text-gray-600">{format.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </Card>
              </div>

              {importProgress > 0 && (
                <Card title="Export Progress">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Exporting data...</span>
                      <span className="text-sm font-semibold text-primary-600">{importProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Import Data</h3>
                <button
                  onClick={handleImport}
                  disabled={!importFile}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import File
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Upload File">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="text-4xl mb-2">📁</div>
                        <p className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          CSV, Excel, or JSON files
                        </p>
                      </label>
                    </div>

                    {importFile && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600">✅</span>
                          <div>
                            <p className="font-medium text-green-900">{importFile.name}</p>
                            <p className="text-sm text-green-700">
                              {(importFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                <Card title="Import Settings">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Type</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option value="students">Students</option>
                        <option value="teachers">Teachers</option>
                        <option value="admins">Admins</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Import Mode</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option value="add">Add New Records</option>
                        <option value="update">Update Existing</option>
                        <option value="replace">Replace All</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="skip-duplicates" className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded" />
                      <label htmlFor="skip-duplicates" className="text-sm text-gray-700">
                        Skip duplicate records
                      </label>
                    </div>
                  </div>
                </Card>
              </div>

              {importProgress > 0 && (
                <Card title="Import Progress">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Processing file...</span>
                      <span className="text-sm font-semibold text-primary-600">{importProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Data Templates</h3>
                <button
                  onClick={generateSampleData}
                  className="px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition"
                >
                  Download Sample
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Student Template">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">👨‍🎓</span>
                      <div>
                        <p className="font-medium text-gray-900">Student Data</p>
                        <p className="text-sm text-gray-600">CSV format</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Fields: Full Name, Email, Contact, Program, Tuition Fee, Status
                    </div>
                    <button className="w-full px-3 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                      Download Template
                    </button>
                  </div>
                </Card>

                <Card title="Teacher Template">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">👨‍🏫</span>
                      <div>
                        <p className="font-medium text-gray-900">Teacher Data</p>
                        <p className="text-sm text-gray-600">CSV format</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Fields: Full Name, Email, Department, Location, Salary
                    </div>
                    <button className="w-full px-3 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                      Download Template
                    </button>
                  </div>
                </Card>

                <Card title="Admin Template">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">🛡️</span>
                      <div>
                        <p className="font-medium text-gray-900">Admin Data</p>
                        <p className="text-sm text-gray-600">CSV format</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Fields: Full Name, Email, Role, Permissions
                    </div>
                    <button className="w-full px-3 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                      Download Template
                    </button>
                  </div>
                </Card>
              </div>

              <Card title="Import Instructions">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📋 Before You Start</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Download the appropriate template for your data type</li>
                      <li>• Fill in all required fields (marked with *)</li>
                      <li>• Ensure email addresses are unique</li>
                      <li>• Use consistent date formats (YYYY-MM-DD)</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Backup your data before importing</li>
                      <li>• Test with a small batch first</li>
                      <li>• Check for duplicate records</li>
                      <li>• Verify all required fields are filled</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Data Management Settings</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Export Settings">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Export Format</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <option value="csv">CSV</option>
                        <option value="excel">Excel</option>
                        <option value="json">JSON</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Include Timestamps</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </Card>

                <Card title="Import Settings">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Auto-validate Data</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max File Size (MB)</label>
                      <input
                        type="number"
                        defaultValue={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <Card title="Data Backup">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Last Backup</p>
                      <p className="text-sm text-gray-600">October 20, 2025 at 2:30 AM</p>
                    </div>
                    <button className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition">
                      Create Backup
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Auto Backup</p>
                      <p className="text-sm text-gray-600">Daily at 2:00 AM</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
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

export default DataManager;