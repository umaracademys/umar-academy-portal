import React, { useEffect, useMemo, useState } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import {
  AssignmentTicket,
  WorkflowStep,
  RecitationUnit,
  StudentRecitationProfile,
  RecitationStep
} from '../types';

interface AssignTicketFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 'program' | 'student' | 'type' | 'teacher' | 'notes' | 'review';

const STEP_ICONS: Record<RecitationStep, string> = {
  sabq: '',
  sabqi: '',
  manzil: ''
};

const STEP_TITLES: Record<RecitationStep, string> = {
  sabq: 'Sabq (New Lesson)',
  sabqi: 'Sabqi (Revision)',
  manzil: 'Manzil'
};

const AssignTicketForm: React.FC<AssignTicketFormProps> = ({ onClose, onSuccess }) => {
  const { students: backendStudents, teachers, tickets, refreshData } = useBackendData();
  const { students: contextStudents, getStudentsByProgram } = useData();
  const { user } = useAuth();
  
  // Merge students from both sources
  const allStudents = useMemo(() => {
    const backendMap = new Map<string, any>(
      backendStudents.map(s => {
        const id = s.id || (s as any)._id;
        return [typeof id === 'string' ? id : String(id), s];
      })
    );
    const contextMap = new Map<string, any>(
      contextStudents.map(s => {
        const id = s.id || '';
        return [typeof id === 'string' ? id : String(id), s];
      })
    );
    const merged = new Map<string, any>();
    
    // Add backend students
    backendMap.forEach((student, id) => {
      const contextStudent = contextMap.get(id);
      if (contextStudent) {
        merged.set(id, { ...student, ...contextStudent });
      } else {
        merged.set(id, student);
      }
    });
    
    // Add context students not in backend
    contextMap.forEach((student, id) => {
      if (!merged.has(id)) {
        merged.set(id, student);
      }
    });
    
    return Array.from(merged.values());
  }, [backendStudents, contextStudents]);

  // Get unique programs
  const programs = useMemo(() => {
    const programSet = new Set<string>();
    allStudents.forEach(student => {
      if (student.program) {
        programSet.add(student.program);
      }
    });
    return Array.from(programSet).sort();
  }, [allStudents]);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('program');
  const [formData, setFormData] = useState({
    program: '',
    studentId: '',
    recitationType: '' as RecitationStep | '',
    teacherId: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearchLetter, setStudentSearchLetter] = useState<string>('ALL');

  // Get students filtered by program
  const programStudents = useMemo(() => {
    if (!formData.program) return [];
    return allStudents.filter(s => s.program === formData.program);
  }, [allStudents, formData.program]);

  // Get students filtered by search letter
  const filteredStudents = useMemo(() => {
    if (studentSearchLetter === 'ALL') return programStudents;
    return programStudents.filter(s => {
      const name = (s.fullName || '').toUpperCase();
      return name.startsWith(studentSearchLetter);
    });
  }, [programStudents, studentSearchLetter]);

  // Get alphabet letters for student search
  const alphabetLetters = useMemo(() => {
    const letters = new Set<string>();
    programStudents.forEach(s => {
      const firstLetter = (s.fullName || '').charAt(0).toUpperCase();
      if (firstLetter && /[A-Z]/.test(firstLetter)) {
        letters.add(firstLetter);
      }
    });
    return Array.from(letters).sort();
  }, [programStudents]);

  // Selected student
  const selectedStudent = useMemo(
    () => allStudents.find(s => {
      const studentId = (s.id || (s as any)._id || '').toString();
      return studentId === formData.studentId;
    }),
    [allStudents, formData.studentId]
  );

  // Auto-select admin for Sabq, require teacher selection for Sabqi/Manzil
  useEffect(() => {
    if (formData.recitationType === 'sabq') {
      // Auto-select admin (current user)
      setFormData(prev => ({ ...prev, teacherId: user?.id || 'admin' }));
    } else if (formData.recitationType === 'sabqi' || formData.recitationType === 'manzil') {
      // Clear teacher selection so user must choose
      setFormData(prev => ({ ...prev, teacherId: '' }));
    }
  }, [formData.recitationType, user]);

  // Get assigned teacher for student (for Sabqi/Manzil)
  const assignedTeacher = useMemo(() => {
    if (!selectedStudent) return null;
    const teacherId = (selectedStudent as any).assignedTeacher || (selectedStudent as any).assignedTeacherId;
    if (!teacherId) return null;
    return teachers.find(t => 
      t.id === teacherId || 
      (t as any)._id === teacherId ||
      (t as any).teacherId === teacherId ||
      (t as any).userId === teacherId
    );
  }, [selectedStudent, teachers]);

  // Auto-select assigned teacher if available for Sabqi/Manzil
  useEffect(() => {
    if ((formData.recitationType === 'sabqi' || formData.recitationType === 'manzil') && assignedTeacher && !formData.teacherId) {
      setFormData(prev => ({ ...prev, teacherId: assignedTeacher.id }));
    }
  }, [formData.recitationType, assignedTeacher, formData.teacherId]);

  // Get selected teacher
  const selectedTeacher = useMemo(() => {
    if (formData.recitationType === 'sabq') {
      return { id: user?.id || 'admin', fullName: user?.name || 'Admin' };
    }
    return teachers.find(t => t.id === formData.teacherId);
  }, [formData.teacherId, formData.recitationType, teachers, user]);

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 'program' && formData.program) {
      setCurrentStep('student');
    } else if (currentStep === 'student' && formData.studentId) {
      setCurrentStep('type');
    } else if (currentStep === 'type' && formData.recitationType) {
      if (formData.recitationType === 'sabq') {
        // Skip teacher selection for Sabq (auto-admin)
        setCurrentStep('notes');
      } else {
        setCurrentStep('teacher');
      }
    } else if (currentStep === 'teacher' && formData.teacherId) {
      setCurrentStep('notes');
    } else if (currentStep === 'notes') {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'review') {
      setCurrentStep('notes');
    } else if (currentStep === 'notes') {
      if (formData.recitationType === 'sabq') {
        setCurrentStep('type');
      } else {
        setCurrentStep('teacher');
      }
    } else if (currentStep === 'teacher') {
      setCurrentStep('type');
    } else if (currentStep === 'type') {
      setCurrentStep('student');
    } else if (currentStep === 'student') {
      setCurrentStep('program');
    }
  };

  const canProceed = useMemo(() => {
    if (currentStep === 'program') return !!formData.program;
    if (currentStep === 'student') return !!formData.studentId;
    if (currentStep === 'type') return !!formData.recitationType;
    if (currentStep === 'teacher') return !!formData.teacherId;
    if (currentStep === 'notes') return true; // Notes are optional
    if (currentStep === 'review') {
      // Review step: ensure all required fields are filled
      if (!formData.program || !formData.studentId || !formData.recitationType) return false;
      // For Sabqi/Manzil, teacher must be selected
      if ((formData.recitationType === 'sabqi' || formData.recitationType === 'manzil')) {
        return !!formData.teacherId;
      }
      // For Sabq, teacher is auto-selected (admin), but we need user to be logged in
      if (formData.recitationType === 'sabq') {
        return !!(user?.id || user?.email); // Admin must be logged in
      }
      return true;
    }
    return false;
  }, [currentStep, formData, user]);

  // Submit handler
  const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Validate required fields
    if (!formData.studentId || !formData.recitationType) {
      alert('Please complete all required fields');
      return;
    }

    if ((formData.recitationType === 'sabqi' || formData.recitationType === 'manzil') && !formData.teacherId) {
      alert('Please select a teacher');
      return;
    }

    if (isSubmitting) {
      return; // Prevent double submission
    }

    // Additional validation for Sabq
    if (formData.recitationType === 'sabq' && !user?.id) {
      alert('Admin user not found. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const student = selectedStudent;
      if (!student) {
        throw new Error('Student not found');
      }

      const ticketData = {
        studentId: formData.studentId || (student.id || (student as any)._id || '').toString(),
        studentName: student.fullName,
        assignedTeacherId: formData.recitationType === 'sabq' 
          ? (user?.id || 'admin')
          : formData.teacherId,
        assignedTeacherName: formData.recitationType === 'sabq'
          ? (user?.name || 'Admin')
          : (selectedTeacher?.fullName || ''),
        status: 'assigned' as const,
        program: formData.program,
        workflowStep: formData.recitationType as WorkflowStep,
        notes: formData.notes.trim() || undefined,
        autoCreateChain: false
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/tickets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ticketData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create ticket');
      }

      await response.json();
      await refreshData();

      alert(`Ticket created successfully!\n\n${student.fullName} - ${STEP_TITLES[formData.recitationType as RecitationStep]}\nAssigned to: ${formData.recitationType === 'sabq' ? (user?.name || 'Admin') : (selectedTeacher?.fullName || '')}`);
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      alert(error.message || 'Failed to create ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps: Array<{ key: WizardStep; label: string; icon: string }> = [
    { key: 'program', label: 'Program', icon: '' },
    { key: 'student', label: 'Student', icon: '' },
    { key: 'type', label: 'Type', icon: '' },
    { key: 'teacher', label: 'Teacher', icon: '' },
    { key: 'notes', label: 'Notes', icon: '' },
    { key: 'review', label: 'Review', icon: '' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 md:p-6">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)] to-[var(--color-accent)] text-white px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Create New Ticket</h2>
            <p className="text-white/90 text-xs sm:text-sm mt-1">Step-by-step ticket assignment</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/20 hover:bg-white/30 p-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max">
            {steps.map((step, index) => {
              const isActive = currentStep === step.key;
              const isCompleted = currentStepIndex > index;
              const isSkippable = step.key === 'teacher' && formData.recitationType === 'sabq';

              if (isSkippable) return null;

              return (
                <React.Fragment key={step.key}>
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full text-sm sm:text-base font-semibold transition-all ${
                        isActive
                          ? 'bg-[var(--color-primary)] text-white scale-110 shadow-lg'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? '✓' : (step.icon || String(index + 1))}
                    </div>
                    <div className="ml-2 hidden sm:block">
                      <div className={`text-xs sm:text-sm font-semibold ${isActive ? 'text-[var(--color-primary)]' : 'text-gray-500'}`}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && !(step.key === 'type' && formData.recitationType === 'sabq') && (
                    <div
                      className={`w-8 sm:w-16 h-0.5 mx-2 transition-all ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {/* Step 1: Program Selection */}
          {currentStep === 'program' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Select Program</h3>
                <p className="text-gray-600 text-sm sm:text-base">Choose the program to filter students</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {programs.map(program => (
                  <button
                    key={program}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, program, studentId: '' }))}
                    className={`p-4 sm:p-5 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                      formData.program === program
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-[var(--color-primary)]/50'
                    }`}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-2"></div>
                    <div className="font-semibold text-gray-900 text-sm sm:text-base">{program}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {programStudents.length} student{programStudents.length !== 1 ? 's' : ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Student Selection */}
          {currentStep === 'student' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Select Student</h3>
                <p className="text-gray-600 text-sm sm:text-base">Choose a student from {formData.program}</p>
              </div>

              {/* Alphabet Filter */}
              {alphabetLetters.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setStudentSearchLetter('ALL')}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        studentSearchLetter === 'ALL'
                          ? 'bg-[var(--color-primary)] text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-[var(--color-primary)]'
                      }`}
                    >
                      ALL
                    </button>
                    {alphabetLetters.map(letter => (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => setStudentSearchLetter(letter)}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                          studentSearchLetter === letter
                            ? 'bg-[var(--color-primary)] text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:border-[var(--color-primary)]'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Grid */}
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-4"></div>
                  <p className="text-gray-600">No students found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredStudents.map(student => {
                    const studentId = (student.id || (student as any)._id || '').toString();
                    const isSelected = formData.studentId === studentId;
                    return (
                      <button
                        key={studentId}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, studentId }))}
                        className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-[var(--color-primary)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white flex items-center justify-center font-bold text-lg">
                            {(student.fullName || '').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {student.fullName || 'Unnamed Student'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{student.program || 'No program'}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Recitation Type */}
          {currentStep === 'type' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Select Recitation Type</h3>
                <p className="text-gray-600 text-sm sm:text-base">What will the student be reciting?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {(['sabq', 'sabqi', 'manzil'] as RecitationStep[]).map(type => {
                  const isSelected = formData.recitationType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, recitationType: type }))}
                      className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      <div className="text-4xl mb-3">{STEP_ICONS[type]}</div>
                      <div className="font-bold text-gray-900 text-base sm:text-lg mb-2">{STEP_TITLES[type]}</div>
                      <div className="text-xs text-gray-500">
                        {type === 'sabq' && 'Auto-assigned to Admin'}
                        {type === 'sabqi' && 'Requires teacher selection'}
                        {type === 'manzil' && 'Requires teacher selection'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Teacher Selection (Skipped for Sabq) */}
          {currentStep === 'teacher' && formData.recitationType !== 'sabq' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Select Teacher</h3>
                <p className="text-gray-600 text-sm sm:text-base">Assign a teacher for {STEP_TITLES[formData.recitationType as RecitationStep]}</p>
              </div>
              {assignedTeacher && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Suggested:</strong> {assignedTeacher.fullName} (assigned to this student)
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {teachers.map(teacher => {
                  const isSelected = formData.teacherId === teacher.id;
                  return (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, teacherId: teacher.id }))}
                      className={`p-4 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold text-lg">
                          {(teacher.fullName || '').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {teacher.fullName}
                          </div>
                          <div className="text-xs text-gray-500">{teacher.email}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Notes */}
          {currentStep === 'notes' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Notes for Teacher</h3>
                <p className="text-gray-600 text-sm sm:text-base">Add any special instructions (optional)</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Student: <span className="text-[var(--color-primary)]">{selectedStudent?.fullName}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Type: <span className="text-[var(--color-primary)]">{STEP_TITLES[formData.recitationType as RecitationStep]}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">
                    Teacher: <span className="text-[var(--color-primary)]">
                      {formData.recitationType === 'sabq' 
                        ? (user?.name || 'Admin')
                        : (selectedTeacher?.fullName || 'Not selected')}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all resize-none"
                  placeholder="Example: Focus on tajweed rules, especially madd. Double-check page 132..."
                />
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Review & Confirm</h3>
                <p className="text-gray-600 text-sm sm:text-base">Please review all details before creating the ticket</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Program</div>
                    <div className="text-lg font-bold text-gray-900">{formData.program}</div>
                  </div>
                </div>
                <div className="border-t border-gray-300 pt-4"></div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Student</div>
                    <div className="text-lg font-bold text-gray-900">{selectedStudent?.fullName}</div>
                    <div className="text-sm text-gray-600 mt-1">{selectedStudent?.email}</div>
                  </div>
                </div>
                <div className="border-t border-gray-300 pt-4"></div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Recitation Type</div>
                    <div className="text-lg font-bold text-gray-900">{STEP_TITLES[formData.recitationType as RecitationStep]}</div>
                  </div>
                </div>
                <div className="border-t border-gray-300 pt-4"></div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assigned To</div>
                    <div className="text-lg font-bold text-gray-900">
                      {formData.recitationType === 'sabq'
                        ? (user?.name || 'Admin')
                        : (selectedTeacher?.fullName || 'Not selected')}
                    </div>
                    {formData.recitationType !== 'sabq' && selectedTeacher?.email && (
                      <div className="text-sm text-gray-600 mt-1">{selectedTeacher.email}</div>
                    )}
                  </div>
                </div>
                {formData.notes.trim() && (
                  <>
                    <div className="border-t border-gray-300 pt-4"></div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-200">
                          {formData.notes}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-between">
          <button
            type="button"
            onClick={currentStep === 'program' ? onClose : handleBack}
            className="px-6 py-3 rounded-xl border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-all w-full sm:w-auto"
          >
            {currentStep === 'program' ? 'Cancel' : '← Back'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (currentStep === 'review') {
                handleSubmit(e);
              } else {
                handleNext();
              }
            }}
            disabled={isSubmitting || (currentStep === 'review' && !canProceed)}
            className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? 'Creating...' : currentStep === 'review' ? 'Create Ticket' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignTicketForm;
