import React from 'react';

const StudentTest: React.FC = () => {
  console.log('🧪 StudentTest component is rendering!');
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-green-600 mb-4">✅ Student Test Page Working!</h1>
        <p className="text-gray-600 mb-4">If you can see this, the student routing is working.</p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
          <h3 className="font-semibold text-green-800 mb-2">Success!</h3>
          <p className="text-sm text-green-700">Student routing is functional.</p>
        </div>
      </div>
    </div>
  );
};

export default StudentTest;








