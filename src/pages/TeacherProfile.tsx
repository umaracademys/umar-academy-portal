import React, { useState } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import DebugPanel from '../components/DebugPanel';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import ProfileUpdateRequestModal from '../components/ProfileUpdateRequestModal';

const TeacherProfile: React.FC = () => {
  const { teachers } = useData();
  const { user } = useAuth();
  const [showUpdateRequestModal, setShowUpdateRequestModal] = useState(false);

  // Get current teacher info
  const currentTeacher = teachers.find(t => t.email === user?.email) || teachers[0];

  if (!currentTeacher) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p>Teacher profile not found.</p>
        </div>
      </div>
    );
  }

  // Get currency symbol
  const currencySymbol = currentTeacher.payroll?.currency === 'USD' ? '$' : 'Rs';
  const locationFlag = currentTeacher.location === 'Local' ? '🇺🇸' : '🇵🇰';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">View your complete employment and payroll information</p>
          </div>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <img
              src={currentTeacher.avatar}
              alt={currentTeacher.fullName}
              className="h-20 w-20 rounded-full border-4 border-white"
            />
            <div>
              <h2 className="text-2xl font-bold">{currentTeacher.fullName}</h2>
              <p className="text-primary-100">{currentTeacher.department}</p>
              <p className="text-primary-200 text-sm mt-1">
                {currentTeacher.employmentType} • {currentTeacher.status === 'active' ? '✓ Active' : '✗ Inactive'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card title="👤 Personal Information">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600">Email Address</p>
                <p className="font-medium text-gray-900">{currentTeacher.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Phone Number</p>
                <p className="font-medium text-gray-900">{currentTeacher.phoneNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Emergency Contact</p>
                <p className="font-medium text-gray-900">{currentTeacher.emergencyContact}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Department</p>
                <p className="font-medium text-gray-900">{currentTeacher.department}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Location</p>
                <p className="font-medium text-gray-900">
                  {locationFlag} {currentTeacher.location}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Hire Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(currentTeacher.hireDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Teacher ID</p>
                <p className="font-medium text-gray-900">{currentTeacher.id}</p>
              </div>
            </div>
          </Card>

          {/* Employment Details */}
          <Card title="💼 Employment Details">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600">Employment Type</p>
                <p className="font-medium text-gray-900">
                  <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm">
                    {currentTeacher.employmentType}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Shift Type</p>
                <p className="font-medium text-gray-900">{currentTeacher.shiftType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-2">Assigned Shifts</p>
                <div className="space-y-2">
                  {(currentTeacher.shifts || []).map((shift, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded flex justify-between">
                      <span className="font-medium text-sm">{shift.name}</span>
                      <span className="text-sm text-gray-600">{shift.startTime} - {shift.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600">Working Days</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(currentTeacher.schedule?.days || []).map(day => (
                    <span key={day} className="bg-cream-200 text-primary-800 px-2 py-1 rounded text-xs">
                      {day.substring(0, 3)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Payroll Information */}
        <div className="mt-6">
          <Card title={`💰 Payroll Information (${currentTeacher.payroll?.currency || 'USD'})`}>
            <div className="mb-4 p-3 bg-cream-100 border border-gold-300 rounded-lg">
              <p className="text-sm text-primary-800">
                💵 <strong>Currency:</strong> {currentTeacher.payroll?.currency || 'USD'} ({currencySymbol}) • 
                <strong> Location:</strong> {locationFlag} {currentTeacher.location}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Hourly Rate</p>
                <p className="text-2xl font-bold text-primary-600">{currencySymbol}{currentTeacher.payroll?.hourlyRate?.toLocaleString() || '0'}</p>
                <p className="text-xs text-gray-500">per hour</p>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Daily Hours</p>
                <p className="text-2xl font-bold text-gold-600">{currentTeacher.payroll?.dailyHours || 0} hrs</p>
                <p className="text-xs text-gray-500">per day</p>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Days Working</p>
                <p className="text-2xl font-bold text-primary-700">{currentTeacher.payroll?.daysWorking || 0}</p>
                <p className="text-xs text-gray-500">per month</p>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                <p className="text-sm text-gray-600">Monthly Hours</p>
                <p className="text-2xl font-bold text-primary-600">{currentTeacher.payroll?.monthlyHours || 0} hrs</p>
                <p className="text-xs text-gray-500">{currentTeacher.payroll?.dailyHours || 0} × {currentTeacher.payroll?.daysWorking || 0}</p>
              </div>
              <div className={`p-4 rounded-lg md:col-span-2 border ${
                currentTeacher.payroll?.currency === 'PKR' ? 'bg-primary-50 border-primary-200' : 'bg-gold-50 border-gold-200'
              }`}>
                <p className="text-sm text-gray-600">Monthly Salary ({currentTeacher.payroll?.currency || 'USD'})</p>
                <p className={`text-3xl font-bold ${
                  currentTeacher.payroll?.currency === 'PKR' ? 'text-primary-600' : 'text-gold-600'
                }`}>
                  {currencySymbol}{currentTeacher.payroll?.monthlySalary?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-gray-500">
                  {currencySymbol}{currentTeacher.payroll?.hourlyRate?.toLocaleString() || '0'}/hr × {currentTeacher.payroll?.monthlyHours || 0} hrs
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Schedule Information */}
        <div className="mt-6">
          <Card title="📅 My Schedule & Working Hours">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Working Days */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  📆 Working Days
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(currentTeacher.schedule?.days || []).map(day => (
                    <span key={day} className="bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm font-medium">
                      {day}
                    </span>
                  ))}
                  {(currentTeacher.schedule?.days || []).length === 0 && (
                    <span className="text-gray-500 text-sm">No working days specified</span>
                  )}
                </div>
              </div>

              {/* Shift Information */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  ⏰ Shift Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Shift Type:</span>
                    <span className="font-medium text-gray-900">{currentTeacher.shiftType || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Employment Type:</span>
                    <span className="font-medium text-gray-900">{currentTeacher.employmentType || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Shifts */}
            {(currentTeacher.shifts || []).length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  🕐 Assigned Shifts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(currentTeacher.shifts || []).map((shift, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{shift.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {shift.startTime} - {shift.endTime}
                          </p>
                        </div>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Schedule View */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                📊 Weekly Schedule Overview
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-7 gap-2">
                  {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const).map(day => {
                    const isWorkingDay = (currentTeacher.schedule?.days || []).includes(day as any);
                    return (
                      <div key={day} className={`text-center p-3 rounded-lg ${
                        isWorkingDay 
                          ? 'bg-green-100 border-2 border-green-300' 
                          : 'bg-gray-100 border-2 border-gray-200'
                      }`}>
                        <div className="text-xs font-medium text-gray-600 mb-1">
                          {day.substring(0, 3)}
                        </div>
                        <div className={`text-sm font-semibold ${
                          isWorkingDay ? 'text-green-800' : 'text-gray-500'
                        }`}>
                          {isWorkingDay ? '✓' : '—'}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {isWorkingDay ? 'Working' : 'Off'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Working Days: <span className="font-semibold text-green-700">
                      {(currentTeacher.schedule?.days || []).length} days per week
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Assigned Students */}
        <div className="mt-6">
          <Card title="👨‍🎓 Assigned Students">
            <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
              <p className="text-sm text-gray-600">Total Assigned Students</p>
              <p className="text-3xl font-bold text-primary-600">{currentTeacher.assignedStudents?.length || 0}</p>
            </div>
          </Card>
        </div>

        {/* Permissions */}
        <div className="mt-6">
          <Card title="🔐 My Permissions & Access">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(currentTeacher.permissions || {}).map(([key, value]) => (
                <div 
                  key={key} 
                  className={`p-3 rounded-lg border ${
                    value ? 'bg-primary-50 border-primary-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <span className={`text-lg ${value ? 'text-primary-600' : 'text-red-600'}`}>
                      {value ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ID Document */}
        {currentTeacher.idDocument && (
          <div className="mt-6">
            <Card title="📄 ID Document">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Uploaded ID Document</p>
                {currentTeacher.idDocument.startsWith('data:image') ? (
                  <img 
                    src={currentTeacher.idDocument} 
                    alt="ID Document" 
                    className="max-w-md rounded border border-gray-300"
                  />
                ) : (
                  <a 
                    href={currentTeacher.idDocument} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    View Document
                  </a>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setShowUpdateRequestModal(true)}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition"
          >
            Request Profile Update
          </button>
        </div>
      </div>

      {/* Profile Update Request Modal */}
      {showUpdateRequestModal && currentTeacher && (
        <ProfileUpdateRequestModal
          onClose={() => setShowUpdateRequestModal(false)}
          onSuccess={() => {
            // Refresh notifications if needed
            setShowUpdateRequestModal(false);
          }}
          teacherName={currentTeacher.fullName}
          teacherId={currentTeacher.id}
        />
      )}
      
      <DebugPanel />
    </div>
  );
};

export default TeacherProfile;
