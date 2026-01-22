import React from 'react';

interface TeacherProfileProps {
  teacher: any;
  onClose: () => void;
  onEdit: (teacher: any) => void;
}

const TeacherProfile: React.FC<TeacherProfileProps> = ({
  teacher,
  onClose,
  onEdit,
}) => {
  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '—');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="bg-primary px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Teacher Profile</h2>
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="flex items-start gap-4">
            <img
              src={
                teacher.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  teacher.fullName || 'Teacher',
                )}&background=random&color=fff`
              }
              alt={teacher.fullName}
              className="h-20 w-20 rounded-full border-2 border-gray-200"
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">{teacher.fullName}</h3>
              <p className="text-gray-600">{teacher.email || 'No email'}</p>
              <div className="mt-2 flex gap-2">
                {teacher.isAdmin && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                    Admin
                  </span>
                )}
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  teacher.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {teacher.status || 'active'}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
              <p className="text-sm text-gray-900 mt-1">{teacher.email || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
              <p className="text-sm text-gray-900 mt-1">{teacher.contact || teacher.phone || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Department</label>
              <p className="text-sm text-gray-900 mt-1">
                {teacher.department || teacher.assignedDepartments?.[0] || '—'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => onEdit(teacher)}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Edit Teacher
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
