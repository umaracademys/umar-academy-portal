import React from 'react';

interface StudentProfileProps {
  student: any;
  onClose: () => void;
  onEdit: (student: any) => void;
}

const StudentProfile: React.FC<StudentProfileProps> = ({
  student,
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
            <h2 className="text-2xl font-bold text-white">Student Profile</h2>
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
                student.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  student.fullName || 'Student',
                )}&background=random&color=fff`
              }
              alt={student.fullName}
              className="h-20 w-20 rounded-full border-2 border-gray-200"
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">{student.fullName}</h3>
              <p className="text-gray-600">{student.email || 'No email'}</p>
              <div className="mt-2 flex gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  {student.program || 'No program'}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  student.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {student.status || 'active'}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Parent/Guardian</label>
              <p className="text-sm text-gray-900 mt-1">{student.parentName || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Contact</label>
              <p className="text-sm text-gray-900 mt-1">{student.contact || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Tuition Fee</label>
              <p className="text-sm text-gray-900 mt-1">
                {student.tuitionFee ? `$${student.tuitionFee.toLocaleString()}` : '—'}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Enrollment Date</label>
              <p className="text-sm text-gray-900 mt-1">{formatDate(student.enrollmentDate)}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Payment Status</label>
              <p className="text-sm text-gray-900 mt-1 capitalize">{student.paymentStatus || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Level</label>
              <p className="text-sm text-gray-900 mt-1">{student.level || '—'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => onEdit(student)}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Edit Student
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

export default StudentProfile;
