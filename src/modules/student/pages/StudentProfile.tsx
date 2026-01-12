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
      
      <div className="max-w-5xl mx-auto px-2 sm:px-3 lg:px-4 py-2">
        {/* Header - Compact */}
        <div className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
          <div>
            <h1 className="text-lg font-bold text-gray-900">My Profile</h1>
          </div>
          <a
            href="/student/dashboard"
            className="w-full sm:w-auto px-2.5 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium transition text-xs text-center"
          >
            ← Back
          </a>
        </div>

        {/* Profile Card - Compact */}
        <div className="bg-primary-600 text-white rounded shadow p-2 mb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <img
              src={currentStudent.avatar}
              alt={currentStudent.fullName}
              className="h-12 w-12 rounded-full border-2 border-white flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold">{currentStudent.fullName}</h2>
              <p className="text-xs text-primary-100 mt-0.5">{currentStudent.program} • {(currentStudent as any).level}</p>
              <p className="text-[10px] text-primary-200 mt-0.5">
                ID: {currentStudent.id} • {currentStudent.status === 'active' ? '✓ Active' : '✗ Inactive'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {/* Personal Information - Compact */}
          <Card title="Personal Info">
            <div className="space-y-1.5">
              <div>
                <p className="text-[9px] text-gray-600">Full Name</p>
                <p className="text-xs font-medium text-gray-900">{currentStudent.fullName}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600">Email</p>
                <p className="text-xs font-medium text-gray-900">{currentStudent.email}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600">Phone</p>
                <p className="text-xs font-medium text-gray-900">{currentStudent.contact}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600">Program</p>
                <p className="text-xs font-medium text-gray-900">
                  <span className="bg-primary-100 text-primary-800 px-1.5 py-0.5 rounded text-[10px]">
                    {currentStudent.program}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600">Level</p>
                <p className="text-xs font-medium text-gray-900">{(currentStudent as any).level}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600">Teacher</p>
                <p className="text-xs font-medium text-gray-900">{currentStudent.assignedTeacher}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600">Enrolled</p>
                <p className="text-xs font-medium text-gray-900">
                  {new Date(currentStudent.enrolledDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </Card>

          {/* Academic Information - Compact */}
          <Card title="Academic">
            <div className="space-y-1.5">
              <div>
                <p className="text-[9px] text-gray-600">Status</p>
                <p className="text-xs font-medium text-gray-900">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    currentStudent.status === 'active' ? 'bg-green-100 text-green-800' :
                    currentStudent.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {currentStudent.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600">Schedule</p>
                <p className="text-xs font-medium text-gray-900">
                  {currentStudent.schedule ? 
                    `${currentStudent.schedule.days?.join(', ')} at ${currentStudent.schedule.startTime}` :
                    'Not set'
                  }
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-600">Progress</p>
                <p className="text-xs font-medium text-gray-900">In Progress</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Financial Information - Compact */}
        <div className="mt-2">
          <Card title="Financial">
            <div className="mb-1.5 p-1.5 bg-cream-100 border border-gold-300 rounded text-xs">
              <p className="text-[10px] text-primary-800">
                <strong>Tuition:</strong> ${currentStudent.tuitionFee} • 
                <strong> Status:</strong> {(currentStudent as any).paymentStatus}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-cream-100 p-1.5 rounded border border-gold-200">
                <p className="text-[9px] text-gray-600">Tuition</p>
                <p className="text-sm font-bold text-primary-600">${currentStudent.tuitionFee}</p>
                <p className="text-[9px] text-gray-500">per month</p>
              </div>
              <div className="bg-cream-100 p-1.5 rounded border border-gold-200">
                <p className="text-[9px] text-gray-600">Status</p>
                <p className={`text-sm font-bold ${
                    (currentStudent as any).paymentStatus === 'current' ? 'text-green-600' :
                    (currentStudent as any).paymentStatus === 'pending' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {(currentStudent as any).paymentStatus}
                </p>
              </div>
              <div className="bg-cream-100 p-1.5 rounded border border-gold-200">
                <p className="text-[9px] text-gray-600">Enrollment</p>
                <p className="text-sm font-bold text-primary-600">$50</p>
                <p className="text-[9px] text-gray-500">one-time</p>
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

        {/* Account Settings - Compact */}
        <div className="mt-2">
          <Card title="Account">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded">
                <div>
                  <p className="text-xs font-medium text-gray-900">Password</p>
                  <p className="text-[10px] text-gray-600">Change password</p>
                </div>
                <button
                  onClick={() => setShowPasswordChangeModal(true)}
                  className="px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 font-medium transition text-xs"
                >
                  Change
                </button>
              </div>
              {user?.passwordChangeRequired && (
                <div className="p-1.5 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-yellow-800">
                  <strong>Action Required:</strong> Please change your password.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Actions - Compact */}
        <div className="mt-2 flex justify-end gap-1.5">
          <button
            onClick={() => setShowUpdateRequestModal(true)}
            className="px-2.5 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium transition text-xs"
          >
            Request Update
          </button>
          <button className="px-2.5 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 font-medium text-xs">
            Download Record
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








