import React from 'react';

const StudentDashboardDebug: React.FC = () => {
  console.log('🔍 StudentDashboardDebug - Component is rendering!');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Student Dashboard Debug</h1>
          <div className="space-y-4">
            <p className="text-gray-700">
              This is a simplified version of the student dashboard to test if the routing works.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-800 mb-2">✅ Success!</h2>
              <p className="text-green-700">
                If you can see this page, the student routing is working correctly.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">Navigation</h2>
              <p className="text-blue-700">
                You can now navigate to other student pages to test the full functionality.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardDebug;

