import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useLocation } from 'react-router-dom';

const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { students, teachers, admins } = useData();
  const location = useLocation();

  const getLocalStorageData = () => {
    return {
      user: localStorage.getItem('user'),
      students: localStorage.getItem('umar_academy_students'),
      teachers: localStorage.getItem('umar_academy_teachers'),
      admins: localStorage.getItem('umar_academy_admins'),
    };
  };

  const clearCache = () => {
    if (window.confirm('Clear browser cache and reload?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const localData = getLocalStorageData();

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full text-white font-bold shadow-lg hover:shadow-xl transition-all z-50"
        style={{ backgroundColor: isOpen ? '#E7AA39' : '#2E4D32' }}
        title="Toggle Debug Panel"
      >
        {isOpen ? '✕' : '🔧'}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-20 right-4 w-96 max-h-[80vh] overflow-y-auto bg-white rounded-xl shadow-2xl border-2 z-50"
          style={{ borderColor: '#2E4D32' }}
        >
          {/* Header */}
          <div className="p-4 text-white rounded-t-xl" style={{ backgroundColor: '#2E4D32' }}>
            <h3 className="text-lg font-bold">Debug Panel</h3>
            <p className="text-xs opacity-90">Development Tools</p>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 text-sm">
            {/* Current Route */}
            <div className="border-b pb-3">
              <div className="font-bold text-gray-900 mb-2">📍 Current Route</div>
              <div className="bg-gray-50 p-2 rounded font-mono text-xs">
                {location.pathname}
              </div>
            </div>

            {/* Auth Status */}
            <div className="border-b pb-3">
              <div className="font-bold text-gray-900 mb-2">🔐 Authentication</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-semibold ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                    {isAuthenticated ? '✓ Authenticated' : '✗ Not Authenticated'}
                  </span>
                </div>
                {user && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-semibold">{user.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Role:</span>
                      <span className="font-semibold capitalize">{user.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-semibold text-xs">{user.email}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Data Counts */}
            <div className="border-b pb-3">
              <div className="font-bold text-gray-900 mb-2">📊 Data Summary</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                  <div className="text-2xl font-bold" style={{ color: '#2E4D32' }}>{students.length}</div>
                  <div className="text-xs text-gray-600">Students</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-center">
                  <div className="text-2xl font-bold" style={{ color: '#E7AA39' }}>{teachers.length}</div>
                  <div className="text-xs text-gray-600">Teachers</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center">
                  <div className="text-2xl font-bold text-gray-700">{admins.length}</div>
                  <div className="text-xs text-gray-600">Admins</div>
                </div>
              </div>
            </div>

            {/* Students List */}
            {students.length > 0 && (
              <div className="border-b pb-3">
                <div className="font-bold text-gray-900 mb-2">👨‍🎓 Students ({students.length})</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {students.map((s, i) => (
                    <div key={s.id} className="text-xs bg-gray-50 p-2 rounded">
                      <div className="font-semibold">{i + 1}. {s.fullName}</div>
                      <div className="text-gray-600">Program: {s.program}</div>
                      <div className="text-gray-600">ID: {s.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teachers List */}
            {teachers.length > 0 && (
              <div className="border-b pb-3">
                <div className="font-bold text-gray-900 mb-2">👨‍🏫 Teachers ({teachers.length})</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {teachers.map((t, i) => (
                    <div key={t.id} className="text-xs bg-gray-50 p-2 rounded">
                      <div className="font-semibold">{i + 1}. {t.fullName}</div>
                      <div className="text-gray-600">Dept: {t.department}</div>
                      <div className="text-gray-600">ID: {t.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LocalStorage Info */}
            <div className="border-b pb-3">
              <div className="font-bold text-gray-900 mb-2">💾 localStorage</div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Students:</span>
                  <span className={localData.students ? 'text-green-600 font-semibold' : 'text-red-600'}>
                    {localData.students ? '✓ Stored' : '✗ Empty'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Teachers:</span>
                  <span className={localData.teachers ? 'text-green-600 font-semibold' : 'text-red-600'}>
                    {localData.teachers ? '✓ Stored' : '✗ Empty'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Admins:</span>
                  <span className={localData.admins ? 'text-green-600 font-semibold' : 'text-red-600'}>
                    {localData.admins ? '✓ Stored' : '✗ Empty'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="font-bold text-gray-900 mb-2">⚡ Quick Actions</div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    console.log('=== DEBUG INFO ===');
                    console.log('User:', user);
                    console.log('Students:', students);
                    console.log('Teachers:', teachers);
                    console.log('Admins:', admins);
                    console.log('localStorage:', localData);
                    alert('Debug info logged to console (F12)');
                  }}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                >
                  Log to Console
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify({ user, students, teachers, admins }, null, 2));
                    alert('Debug data copied to clipboard!');
                  }}
                  className="w-full px-3 py-2 text-white rounded-lg text-xs font-semibold transition"
                  style={{ backgroundColor: '#2E4D32' }}
                >
                  Copy Debug Data
                </button>
                <button
                  onClick={clearCache}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
                >
                  Clear Cache & Reload
                </button>
              </div>
            </div>

            {/* Timestamp */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              Last Updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DebugPanel;












