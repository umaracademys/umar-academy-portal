import React from 'react';
import Header from '../../../components/Header';
import Card from '../../../components/Card';
import DebugPanel from '../../../components/DebugPanel';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';

const StudentProfile: React.FC = () => {
  const { students, getStudentByEmail } = useData();
  const { user } = useAuth();

  // Get current student info
  const currentStudent = getStudentByEmail(user?.email || '') || students[0];

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p>Student profile not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">View your complete academic and enrollment information</p>
          </div>
          <a
            href="/student/dashboard"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <img
              src={currentStudent.avatar}
              alt={currentStudent.fullName}
              className="h-20 w-20 rounded-full border-4 border-white"
            />
            <div>
              <h2 className="text-2xl font-bold">{currentStudent.fullName}</h2>
              <p className="text-primary-100">{currentStudent.program} • {(currentStudent as any).level}</p>
              <p className="text-primary-200 text-sm mt-1">
                Student ID: {currentStudent.id} • {currentStudent.status === 'active' ? '✓ Active' : '✗ Inactive'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card title="👤 Personal Information">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600">Full Name</p>
                <p className="font-medium text-gray-900">{currentStudent.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Email Address</p>
                <p className="font-medium text-gray-900">{currentStudent.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Phone Number</p>
                <p className="font-medium text-gray-900">{currentStudent.contact}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Program</p>
                <p className="font-medium text-gray-900">
                  <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm">
                    {currentStudent.program}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Level</p>
                <p className="font-medium text-gray-900">{(currentStudent as any).level}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Assigned Teacher</p>
                <p className="font-medium text-gray-900">{currentStudent.assignedTeacher}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Enrollment Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(currentStudent.enrolledDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Student ID</p>
                <p className="font-medium text-gray-900">{currentStudent.id}</p>
              </div>
            </div>
          </Card>

          {/* Academic Information */}
          <Card title="🎓 Academic Information">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600">Current Status</p>
                <p className="font-medium text-gray-900">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    currentStudent.status === 'active' ? 'bg-green-100 text-green-800' :
                    currentStudent.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {currentStudent.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Program Duration</p>
                <p className="font-medium text-gray-900">Full Academic Year</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Class Schedule</p>
                <p className="font-medium text-gray-900">
                  {currentStudent.schedule ? 
                    `${currentStudent.schedule.days?.join(', ')} at ${currentStudent.schedule.startTime}` :
                    'Schedule not set'
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Academic Progress</p>
                <p className="font-medium text-gray-900">In Progress</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Financial Information */}
        <div className="mt-6">
          <Card title="💰 Financial Information">
            <div className="mb-4 p-3 bg-cream-100 border border-gold-300 rounded-lg">
              <p className="text-sm text-primary-800">
                💵 <strong>Monthly Tuition:</strong> ${currentStudent.tuitionFee} • 
                <strong> Payment Status:</strong> {(currentStudent as any).paymentStatus}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Monthly Tuition</p>
                <p className="text-2xl font-bold text-primary-600">${currentStudent.tuitionFee}</p>
                <p className="text-xs text-gray-500">per month</p>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Payment Status</p>
                <p className={`text-2xl font-bold ${
                    (currentStudent as any).paymentStatus === 'current' ? 'text-green-600' :
                    (currentStudent as any).paymentStatus === 'pending' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {(currentStudent as any).paymentStatus}
                </p>
                <p className="text-xs text-gray-500">current status</p>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Enrollment Fee</p>
                <p className="text-2xl font-bold text-primary-600">$50</p>
                <p className="text-xs text-gray-500">one-time</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Parent Information */}
        {currentStudent.parentName && (
          <div className="mt-6">
            <Card title="👨‍👩‍👧‍👦 Parent Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Parent Name</p>
                  <p className="font-medium text-gray-900">{currentStudent.parentName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Contact Number</p>
                  <p className="font-medium text-gray-900">{currentStudent.contact || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{currentStudent.email || 'N/A'}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Contact Information */}
        {(currentStudent.email || currentStudent.contact) && (
          <div className="mt-6">
            <Card title="📧 Contact Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentStudent.email && (
                  <div>
                    <p className="text-xs text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{currentStudent.email}</p>
                  </div>
                )}
                {currentStudent.contact && (
                  <div>
                    <p className="text-xs text-gray-600">Contact</p>
                    <p className="font-medium text-gray-900">{currentStudent.contact}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Siblings Information */}
        {currentStudent.siblings && currentStudent.siblings.length > 0 && (
          <div className="mt-6">
            <Card title="👨‍👩‍👧‍👦 Siblings">
              <div className="space-y-3">
                {currentStudent.siblings.map((sibling, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{sibling.fullName}</p>
                        <p className="text-sm text-gray-600">{sibling.program}</p>
                      </div>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Academic Records */}
        <div className="mt-6">
          <Card title="📚 Academic Records">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Total Assignments</p>
                <p className="text-2xl font-bold text-primary-600">
                  0
                </p>
                <p className="text-xs text-gray-500">this semester</p>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  0
                </p>
                <p className="text-xs text-gray-500">assignments</p>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Program</p>
                <p className="text-2xl font-bold text-primary-600">
                  {currentStudent.program || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">overall</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            Request Information Update
          </button>
          <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
            Download Academic Record
          </button>
        </div>
      </div>
      
      <DebugPanel />
    </div>
  );
};

export default StudentProfile;








