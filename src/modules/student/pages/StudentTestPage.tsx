import React from 'react';

const StudentTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Student Test Page</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-lg text-gray-700">
            This is a test page to verify that the student routing is working correctly.
          </p>
          <div className="mt-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Navigation Test</h2>
            <p className="text-gray-600">
              If you can see this page, the student routing is working properly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentTestPage;

