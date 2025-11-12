import React, { useState } from 'react';
import {
  Student,
  ProgramType,
  ScheduleDay,
  Sibling,
  StudentRecitationProfile
} from '../types';
import { useData } from '../contexts/DataContext';

interface StudentRegistrationFormProps {
  onClose: () => void;
  student?: any; // For editing existing student
  isEdit?: boolean; // Flag to indicate if this is edit mode
}

const StudentRegistrationForm: React.FC<StudentRegistrationFormProps> = ({ onClose, student, isEdit = false }) => {
  const { addStudent, updateStudent, teachers } = useData();
  const [formData, setFormData] = useState({
    fullName: student?.fullName || '',
    parentName: student?.parentName || '',
    email: student?.email || '',
    contact: student?.contact || '',
    program: student?.program || 'Full Time HQ' as ProgramType,
    tuitionFee: student?.tuitionFee || 500,
    registrationAmount: student?.registrationAmount || 100,
    assignedTeacher: student?.assignedTeacher || '',
    scheduleDays: student?.schedule?.days || [] as ScheduleDay[],
    startTime: student?.schedule?.startTime || '09:00',
    endTime: student?.schedule?.endTime || '12:00',
  });

  const [siblings, setSiblings] = useState<Sibling[]>(Array.isArray(student?.siblings) ? student.siblings : []);
  const [showSiblingForm, setShowSiblingForm] = useState(false);
  const [siblingData, setSiblingData] = useState({
    fullName: '',
    program: 'Full Time HQ' as ProgramType,
    assignedTeacher: '',
  });

  const allDays: ScheduleDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleDayToggle = (day: ScheduleDay) => {
    setFormData(prev => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter(d => d !== day)
        : [...prev.scheduleDays, day]
    }));
  };

  const handleAddSibling = () => {
    if (siblingData.fullName) {
      setSiblings([...siblings, { id: `SIB${Date.now()}`, ...siblingData }]);
      setSiblingData({ fullName: '', program: 'Full Time HQ', assignedTeacher: '' });
      setShowSiblingForm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const recitationProfile: StudentRecitationProfile =
      (student?.recitationProfile as StudentRecitationProfile | undefined) ?? {
        current: {},
        history: []
      };

    const studentData: Student = {
      id: isEdit ? student.id : `STU${Date.now()}`,
      studentRecordId: isEdit ? student.studentRecordId : undefined,
      fullName: formData.fullName,
      parentName: formData.parentName,
      email: formData.email,
      contact: formData.contact,
      program: formData.program,
      siblings: siblings,
      tuitionFee: formData.tuitionFee,
      registrationAmount: formData.registrationAmount,
      assignedTeacher: formData.assignedTeacher,
      schedule: {
        days: formData.scheduleDays,
        startTime: formData.startTime,
        endTime: formData.endTime,
      },
      assessments: isEdit ? student.assessments || [] : [],
      evaluations: isEdit ? student.evaluations || [] : [],
      enrolledDate: isEdit ? student.enrolledDate : new Date().toISOString().split('T')[0],
      status: isEdit ? student.status : 'active',
      avatar: isEdit ? student.avatar : `https://ui-avatars.com/api/?name=${formData.fullName.replace(' ', '+')}&background=2E4D32&color=fff`,
      recitationProfile
    };

    try {
      if (isEdit) {
        const { recitationProfile: _profile, studentRecordId: _recordId, ...userUpdatePayload } = studentData;
        await updateStudent(student.id, userUpdatePayload);

      } else {
        await addStudent(studentData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Failed to save student. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">
            {isEdit ? 'Edit Student Profile' : 'Register New Student'}
          </h2>
          <p className="text-primary-100 text-sm mt-1">
            {isEdit ? 'Update student information and enrollment details' : 'Complete student profile and enrollment information'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parent Name *</label>
                <input
                  type="text"
                  required
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1-555-0000"
                />
              </div>
            </div>
          </div>

          {/* Program Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Program *</label>
                <select
                  required
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value as ProgramType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Full Time HQ">Full Time HQ</option>
                  <option value="Part Time HQ">Part Time HQ</option>
                  <option value="After School Reading">After School Reading</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Teacher *</label>
                <select
                  required
                  value={formData.assignedTeacher}
                  onChange={(e) => setFormData({ ...formData, assignedTeacher: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tuition Fee (Monthly) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.tuitionFee}
                  onChange={(e) => setFormData({ ...formData, tuitionFee: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.registrationAmount}
                  onChange={(e) => setFormData({ ...formData, registrationAmount: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Days *</label>
              <div className="flex flex-wrap gap-2">
                {allDays.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      formData.scheduleDays.includes(day)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          {/* Siblings */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Siblings (Optional)</h3>
              <button
                type="button"
                onClick={() => setShowSiblingForm(!showSiblingForm)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                + Add Sibling
              </button>
            </div>

            {showSiblingForm && (
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <input
                    type="text"
                    placeholder="Sibling Full Name"
                    value={siblingData.fullName}
                    onChange={(e) => setSiblingData({ ...siblingData, fullName: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={siblingData.program}
                    onChange={(e) => setSiblingData({ ...siblingData, program: e.target.value as ProgramType })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="Full Time HQ">Full Time HQ</option>
                    <option value="Part Time HQ">Part Time HQ</option>
                    <option value="After School Reading">After School Reading</option>
                  </select>
                  <select
                    value={siblingData.assignedTeacher}
                    onChange={(e) => setSiblingData({ ...siblingData, assignedTeacher: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddSibling}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Add This Sibling
                </button>
              </div>
            )}

            {siblings.length > 0 && (
              <div className="space-y-2">
                {siblings.map((sibling, index) => (
                  <div key={sibling.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium">{sibling.fullName}</p>
                      <p className="text-sm text-gray-600">{sibling.program}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSiblings(siblings.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              {isEdit ? 'Update Student' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistrationForm;
