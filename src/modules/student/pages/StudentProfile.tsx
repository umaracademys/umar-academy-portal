import React, { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import Card from '../../../components/Card';
import DebugPanel from '../../../components/DebugPanel';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import StudentProfileUpdateRequestModal from '../../../components/StudentProfileUpdateRequestModal';
import StudentPasswordChangeModal from '../../../components/StudentPasswordChangeModal';

const StudentProfile: React.FC = () => {
  const { students, getStudentByEmail } = useData();
  const { user } = useAuth();
  const [showUpdateRequestModal, setShowUpdateRequestModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  // Show password change modal on login if passwordChangeRequired is true
  useEffect(() => {
    if (user?.passwordChangeRequired && !showPasswordChangeModal) {
      setShowPasswordChangeModal(true);
    }
  }, [user?.passwordChangeRequired, showPasswordChangeModal]);

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
      
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">View your complete academic and enrollment information</p>
          </div>
          <a
            href="/student/dashboard"
            className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition text-sm sm:text-base text-center touch-target min-h-[44px]"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <img
              src={currentStudent.avatar}
              alt={currentStudent.fullName}
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-white flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">{currentStudent.fullName}</h2>
              <p className="text-sm sm:text-base text-primary-100 mt-1">{currentStudent.program} • {(currentStudent as any).level}</p>
              <p className="text-xs sm:text-sm text-primary-200 mt-1">
                Student ID: {currentStudent.id} • {currentStudent.status === 'active' ? '✓ Active' : '✗ Inactive'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

        {/* Account Settings */}
        <div className="mt-6">
          <Card title="🔐 Account Settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Password</p>
                  <p className="text-sm text-gray-600">Change your account password</p>
                </div>
                <button
                  onClick={() => setShowPasswordChangeModal(true)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition text-sm sm:text-base touch-target min-h-[44px] flex items-center justify-center gap-2"
                >
                  <span>🔒</span>
                  <span>Change Password</span>
                </button>
              </div>
              {user?.passwordChangeRequired && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Action Required:</strong> Please change your password to continue using your account.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setShowUpdateRequestModal(true)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
          >
            Request Information Update
          </button>
          <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
            Download Academic Record
          </button>
        </div>
      </div>

      {/* Profile Update Request Modal */}
      {showUpdateRequestModal && currentStudent && (
        <StudentProfileUpdateRequestModal
          onClose={() => setShowUpdateRequestModal(false)}
          onSuccess={() => {
            setShowUpdateRequestModal(false);
          }}
          studentName={currentStudent.fullName}
          studentId={currentStudent.id}
        />
      )}

      {/* Password Change Modal */}
      {showPasswordChangeModal && (
        <StudentPasswordChangeModal
          onClose={() => {
            setShowPasswordChangeModal(false);
            // If passwordChangeRequired was true, it should be cleared after successful change
          }}
          onPasswordChanged={() => {
            setShowPasswordChangeModal(false);
            // Update user in localStorage to clear the flag
            const savedUser = localStorage.getItem('umar_academy_user');
            if (savedUser) {
              const userData = JSON.parse(savedUser);
              userData.passwordChangeRequired = false;
              localStorage.setItem('umar_academy_user', JSON.stringify(userData));
            }
            // Show success message
            alert('✅ Password changed successfully!');
          }}
        />
      )}
      
      <DebugPanel />
    </div>
  );
};

export default StudentProfile;








