import React, { useState, useEffect } from 'react';
import {
  Student,
  ProgramType,
  StudentRecitationProfile
} from '../types';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';

interface StudentRegistrationFormProps {
  onClose: () => void;
  student?: any; // For editing existing student
  isEdit?: boolean; // Flag to indicate if this is edit mode
}

const StudentRegistrationForm: React.FC<StudentRegistrationFormProps> = ({ onClose, student, isEdit = false }) => {
  const { addStudent, updateStudent, teachers, refreshData } = useData();
  const [formData, setFormData] = useState({
    fullName: student?.fullName || '',
    parentName: student?.parentName || '',
    email: student?.email || '',
    contact: student?.contact || '',
    program: student?.program || 'Full-Time HQ' as ProgramType,
    assignedTeacher: Array.isArray((student as any)?.assignedTeachers) && (student as any).assignedTeachers.length > 0 
      ? (student as any).assignedTeachers 
      : (student as any)?.assignedTeacher 
        ? (Array.isArray((student as any).assignedTeacher) ? (student as any).assignedTeacher : [(student as any).assignedTeacher])
        : [],
  });

  // Initialize form data when student prop changes (for edit mode)
  useEffect(() => {
    if (isEdit && student) {
      if (import.meta.env.DEV) {
        console.log('🔄 Initializing StudentRegistrationForm with student data:', student);
        console.log('🆔 Student IDs:', {
          id: student.id,
          studentRecordId: student.studentRecordId,
          _id: (student as any)._id,
          userId: student.userId
        });
        console.log('📞 Contact field:', student.contact || student.phone || student.phoneNumber || 'Not set');
        console.log('📅 Schedule:', student.schedule);
      }
      setFormData({
        fullName: student.fullName || student.name || '',
        parentName: student.parentName || '',
        email: student.email || '',
        contact: student.contact || student.phoneNumber || student.contactNumber || '',
        program: student.program || 'Full-Time HQ' as ProgramType,
        assignedTeacher: Array.isArray((student as any).assignedTeachers) && (student as any).assignedTeachers.length > 0 
          ? (student as any).assignedTeachers 
          : (student as any).assignedTeacher 
            ? (Array.isArray((student as any).assignedTeacher) ? (student as any).assignedTeacher : [(student as any).assignedTeacher])
            : (student.assignedTeacherId ? [student.assignedTeacherId] : []),
      });
    } else if (!isEdit && !student) {
      // Only reset form when explicitly adding a new student (not editing)
      setFormData({
        fullName: '',
        parentName: '',
        email: '',
        contact: '',
        program: 'Full-Time HQ',
        assignedTeacher: [],
      });
    }
  }, [isEdit, student?.id]); // Only re-run when edit mode or student ID changes


  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    // Validate teacher assignment
    const teacherValue = formData.assignedTeacher;
    const teacherIds = Array.isArray(teacherValue) ? teacherValue : (teacherValue ? [teacherValue] : []);
    if (teacherIds.length === 0) {
      alert('Please select at least one teacher.');
      setIsSubmitting(false);
      return;
    }
    
    setIsSubmitting(true);

    const recitationProfile: StudentRecitationProfile =
      (student?.recitationProfile as StudentRecitationProfile | undefined) ?? {
        current: {},
        history: []
      };

    // Ensure contact is properly set
    const contactValue = formData.contact?.trim() || '';
    
    // Default values for fields not in simplified form
    const scheduleData = {
      days: [],
      startTime: '09:00',
      endTime: '12:00',
    };

    const studentData: Student = {
      id: isEdit ? student.id : `STU${Date.now()}`,
      studentRecordId: isEdit ? student.studentRecordId : undefined,
      fullName: formData.fullName.trim(),
      parentName: formData.parentName.trim(),
      email: formData.email.trim(),
      contact: contactValue, // Ensure contact is always included
      program: formData.program,
      siblings: [], // Empty for simplified form
      tuitionFee: 500, // Default value
      registrationAmount: 100, // Default value
        assignedTeacher: (() => {
        const teacherValue = formData.assignedTeacher;
        const teacherArray = Array.isArray(teacherValue) ? teacherValue : (teacherValue ? [teacherValue] : []);
        return teacherArray.length > 0 ? teacherArray[0] : ''; // Legacy: first teacher for backward compatibility
      })(),
      assignedTeachers: (() => {
        const teacherValue = formData.assignedTeacher;
        return Array.isArray(teacherValue) ? teacherValue : (teacherValue ? [teacherValue] : []); // New: array format
      })(),
      assignedTeacherIds: (() => {
        const teacherValue = formData.assignedTeacher;
        return Array.isArray(teacherValue) ? teacherValue : (teacherValue ? [teacherValue] : []); // New: array format
      })(),
      schedule: scheduleData, // Ensure schedule is always properly structured
      assessments: isEdit ? student.assessments || [] : [],
      evaluations: isEdit ? student.evaluations || [] : [],
      enrolledDate: isEdit ? student.enrolledDate : new Date().toISOString().split('T')[0],
      status: isEdit ? student.status : 'active',
      avatar: isEdit ? student.avatar : `https://ui-avatars.com/api/?name=${formData.fullName.replace(' ', '+')}&background=2E4D32&color=fff`,
      recitationProfile
    };

    try {
      if (isEdit) {
        // CRITICAL: Use studentRecordId (MongoDB _id) for updates, not user id
        // The backend /api/students/:id endpoint expects Student Document ID
        // Priority: studentRecordId > _id > id (but only if id is not a userId)
        let studentIdToUpdate = student.studentRecordId || (student as any)._id;
        
        // If we don't have studentRecordId or _id, check if id is actually a Student Document ID
        // We can't use userId for updates - it will fail with 404
        if (!studentIdToUpdate) {
          // Check if student.id might be the Student Document ID
          // If student has both id and userId, and they're different, id might be the Student ID
          if (student.id && student.userId && student.id !== student.userId) {
            studentIdToUpdate = student.id;
          } else if (student.id && !student.userId) {
            // If there's no userId, then id is likely the Student Document ID
            studentIdToUpdate = student.id;
          }
        }
        
        if (!studentIdToUpdate) {
          // This student only has a User document, not a Student document
          // Log for debugging but don't show as an error - this is expected for some users
          if (import.meta.env.DEV) {
            console.warn('⚠️ Student ID resolution: Student has no Student document (only User document):', {
              studentRecordId: student.studentRecordId,
              _id: (student as any)._id,
              id: student.id,
              userId: student.userId,
              email: student.email,
              fullName: student.fullName
            });
          }
          alert('❌ Cannot edit this student.\n\nThis student does not have a Student document in the database. They only have a User account for login.\n\nTo edit this student:\n1. Close this form\n2. Use "Add Student" to create a Student profile\n3. Link it to the existing User account (same email)');
          setIsSubmitting(false);
          return;
        }
        
        // Additional validation: Check if studentRecordId exists
        // If it doesn't exist, the student only has a User document, not a Student document
        if (!student.studentRecordId && !(student as any)._id) {
          console.warn('⚠️ Student has no Student document - only User document exists');
          alert('⚠️ This student does not have a full Student profile.\n\nThey only have a login account. Please create a Student profile first.');
          setIsSubmitting(false);
          return;
        }
        
        // CRITICAL: Only send changed fields to backend, preserve existing data
        // Backend will merge with existing MongoDB data, not replace it
        const { recitationProfile: _profile, studentRecordId: _recordId, id: _id, ...userUpdatePayload } = studentData;
        
        // Build update payload with only the fields being changed
        // Backend uses $set, so it will only update these fields and preserve the rest
        const updatePayload = {
          fullName: formData.fullName.trim(),
          parentName: formData.parentName.trim(),
          email: formData.email.trim(),
          contact: contactValue,
          program: formData.program,
          tuitionFee: formData.tuitionFee,
          registrationAmount: formData.registrationAmount,
          assignedTeacher: (() => {
            const teacherValue = formData.assignedTeacher;
            const teacherArray = Array.isArray(teacherValue) ? teacherValue : (teacherValue ? [teacherValue] : []);
            return teacherArray.length > 0 ? teacherArray[0] : '';
          })(),
          assignedTeachers: (() => {
            const teacherValue = formData.assignedTeacher;
            return Array.isArray(teacherValue) ? teacherValue : (teacherValue ? [teacherValue] : []);
          })(),
          assignedTeacherIds: (() => {
            const teacherValue = formData.assignedTeacher;
            return Array.isArray(teacherValue) ? teacherValue : (teacherValue ? [teacherValue] : []);
          })(),
          schedule: scheduleData,
          siblings: siblings,
          // Preserve existing fields that aren't being changed
          status: student.status || 'active',
          enrolledDate: student.enrolledDate || new Date().toISOString().split('T')[0],
        };
        
        console.log('🔄 Updating existing student in MongoDB (no new records will be created):', {
          studentId: studentIdToUpdate,
          fieldsBeingUpdated: Object.keys(updatePayload)
        });
        console.log('🔄 Using student ID:', studentIdToUpdate);
        await updateStudent(studentIdToUpdate, updatePayload);
        
        // Refresh data to ensure UI updates
        if (refreshData) {
          await refreshData();
        }
        
        console.log('✅ Student updated successfully.');
        alert('✅ Student updated successfully!');
        
        // Close the form after successful update
        onClose();
        
      } else {
        await addStudent(studentData);
        
        // Refresh data to ensure UI updates
        if (refreshData) {
          await refreshData();
        }
        
        onClose(); // Close for new students
      }
    } catch (error) {
      console.error('Error saving student:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to save student. Please try again.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8 border-2 border-primary">
        <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] p-6 rounded-t-lg">
          <h2 className="text-2xl font-extrabold text-accent">
            {isEdit ? 'Edit Student Profile' : 'Register New Student'}
          </h2>
          <p className="text-accent/90 text-sm mt-1">
            {isEdit ? 'Update student information and enrollment details' : 'Complete student profile and enrollment information'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto bg-white">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-extrabold text-primary mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Parent Name *</label>
                <input
                  type="text"
                  required
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Contact Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.contact || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setFormData(prev => ({ ...prev, contact: newValue }));
                  }}
                  onBlur={(e) => {
                    // Ensure value persists on blur
                    const trimmedValue = e.target.value.trim();
                    if (trimmedValue !== formData.contact) {
                      setFormData(prev => ({ ...prev, contact: trimmedValue }));
                    }
                  }}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  placeholder="+1-555-0000"
                />
              </div>
            </div>
          </div>

          {/* Program Information */}
          <div className="mb-6">
            <h3 className="text-lg font-extrabold text-primary mb-4">Program Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Program *</label>
                <select
                  required
                  value={formData.program}
                  onChange={(e) => {
                    const newProgram = e.target.value as ProgramType;
                    setFormData({ ...formData, program: newProgram });
                  }}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                >
                  <option value="Full-Time HQ">Full-Time HQ</option>
                  <option value="Part-Time HQ">Part-Time HQ</option>
                  <option value="After School">After School</option>
                </select>
              </div>
            </div>
            
            {/* Teacher Assignment */}
            <div className="mt-4">
              <h4 className="text-lg font-extrabold text-primary mb-3 flex items-center gap-2">
                <span>👤</span> Teacher Assignment *
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-extrabold text-primary mb-2">
                    Select Teacher(s) * (You can select multiple teachers)
                  </label>
                  <select
                    required
                    multiple
                    value={(() => {
                      const teacherValue = formData.assignedTeacher;
                      if (Array.isArray(teacherValue)) {
                        return teacherValue;
                      }
                      if (teacherValue && typeof teacherValue === 'string') {
                        return [teacherValue];
                      }
                      return [];
                    })()}
                    onChange={(e) => {
                      const selectElement = e.target as HTMLSelectElement;
                      const selectedOptions = Array.from(selectElement.selectedOptions).map(option => option.value);
                      setFormData({ 
                        ...formData, 
                        assignedTeacher: selectedOptions.length > 0 ? selectedOptions : []
                      });
                    }}
                    className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white min-h-[120px]"
                    size={Math.min(teachers.length + 1, 6)}
                  >
                    <option value="" disabled>Select one or more teachers...</option>
                    {teachers
                      .filter((teacher: any) => {
                        // Filter teachers by program if needed
                        return true; // Show all teachers for now
                      })
                      .map((teacher: any) => {
                        // Use Teacher document _id (MongoDB ID) instead of User id for proper matching
                        const teacherDocId = (teacher as any)._id || (teacher as any).teacherDocumentId || teacher.id;
                        return (
                          <option key={teacher.id} value={teacherDocId}>
                            {teacher.fullName}
                          </option>
                        );
                      })}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    Hold Ctrl (Windows) or Cmd (Mac) to select multiple teachers. All selected teachers will be able to see this student's assignments and tickets.
                  </p>
                  {(() => {
                    const teacherValue = formData.assignedTeacher;
                    const teacherArray = Array.isArray(teacherValue) ? teacherValue : (teacherValue ? [teacherValue] : []);
                    return teacherArray.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {teacherArray.map((teacherId: string) => {
                          // Find teacher by Teacher document _id, teacherDocumentId, or User id
                          const teacher = teachers.find((t: any) => {
                            const tDocId = (t as any)._id?.toString() || (t as any).teacherDocumentId?.toString();
                            const tUserId = t.id?.toString();
                            return tDocId === teacherId || tUserId === teacherId;
                          });
                          return teacher ? (
                            <span key={teacherId} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                              {teacher.fullName}
                            </span>
                          ) : null;
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>


          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t-2 border-primary">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 border-primary rounded-lg hover:bg-primary/10 font-extrabold text-primary shadow-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-accent rounded-lg hover:bg-primary/90 font-extrabold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-105 transition-all"
            >
              {isSubmitting 
                ? (isEdit ? 'Updating...' : 'Registering...') 
                : (isEdit ? 'Update Student' : 'Register Student')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistrationForm;
