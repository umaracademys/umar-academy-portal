import React, { useState, useEffect } from 'react';
import {
  Student,
  ProgramType,
  ScheduleDay,
  Sibling,
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
  const { getPairStudents, getTeacherPairs, createPairStudent, updatePairStudent, deletePairStudent } = useBackendData();
  const [pairInfo, setPairInfo] = useState<any>(null);
  const [teacherPairs, setTeacherPairs] = useState<any[]>([]);
  const [selectedPair, setSelectedPair] = useState<string>('');
  const [pairSchedule, setPairSchedule] = useState({
    startTime: '09:00',
    endTime: '10:00',
    days: [] as string[]
  });
  const [formData, setFormData] = useState({
    fullName: student?.fullName || '',
    parentName: student?.parentName || '',
    email: student?.email || '',
    contact: student?.contact || '',
    program: student?.program || 'Full Time HQ' as ProgramType,
    tuitionFee: typeof student?.tuitionFee === 'number' && !isNaN(student.tuitionFee) ? student.tuitionFee : 500,
    registrationAmount: typeof student?.registrationAmount === 'number' && !isNaN(student.registrationAmount) ? student.registrationAmount : 100,
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
  const pairDays = [
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
    { value: 'sat', label: 'Saturday' },
    { value: 'sun', label: 'Sunday' }
  ];

  const handlePairToggle = (day: string) => {
    setPairSchedule(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handlePairChange = (pairId: string) => {
    setSelectedPair(pairId);
    if (pairId) {
      const pair = teacherPairs.find(p => p._id === pairId);
      if (pair) {
        // Auto-set assigned teacher to first teacher in pair for backward compatibility
        if (pair.teacher1) {
          const teacher1Id = pair.teacher1._id || pair.teacher1;
          const matchingTeacher = teachers.find(t => {
            const tId = (t as any)._id || (t as any).teacherDocumentId || t.id;
            return tId.toString() === teacher1Id.toString();
          });
          if (matchingTeacher) {
            setFormData({ ...formData, assignedTeacher: matchingTeacher.id });
          }
        }
      }
    } else {
      // Clear assigned teacher if pair is deselected
      setFormData({ ...formData, assignedTeacher: '' });
    }
  };

  // Load teacher pairs
  useEffect(() => {
    const loadPairs = async () => {
      try {
        const pairs = await getTeacherPairs();
        // Filter to only active pairs
        const activePairs = pairs.filter((p: any) => p.status === 'active');
        if (import.meta.env.DEV) {
          console.log('📋 Loaded teacher pairs:', activePairs);
          console.log('📋 Active pairs by program:', activePairs.map((p: any) => ({ name: p.name, program: p.program, status: p.status })));
        }
        setTeacherPairs(activePairs);
      } catch (error) {
        console.error('Error loading teacher pairs:', error);
      }
    };
    
    loadPairs();
  }, [getTeacherPairs]);

  // Load pair information for student
  useEffect(() => {
    const loadPairInfo = async () => {
      if (!isEdit || !student?.id) {
        setPairInfo(null);
        setSelectedPair('');
        return;
      }
      
      try {
        const pairStudents = await getPairStudents({ student: student.id, status: 'active' });
        if (pairStudents.length > 0) {
          const pairStudent = pairStudents[0];
          // Get the full pair information
          const pairs = await getTeacherPairs();
          const pair = pairs.find((p: any) => p._id === pairStudent.pair?._id || p._id === pairStudent.pair);
          
          if (pair) {
            setPairInfo({
              pair: pair,
              pairStudent: pairStudent,
              schedule: {
                startTime: pairStudent.startTime,
                endTime: pairStudent.endTime,
                days: pairStudent.days
              }
            });
            setSelectedPair(pair._id);
            setPairSchedule({
              startTime: pairStudent.startTime || '09:00',
              endTime: pairStudent.endTime || '10:00',
              days: pairStudent.days || []
            });
          }
        } else {
          setPairInfo(null);
          setSelectedPair('');
        }
      } catch (error) {
        console.error('Error loading pair info:', error);
        setPairInfo(null);
        setSelectedPair('');
      }
    };
    
    loadPairInfo();
  }, [isEdit, student?.id, getPairStudents, getTeacherPairs]);

  // Initialize form data when student prop changes (for edit mode)
  useEffect(() => {
    if (isEdit && student) {
      if (import.meta.env.DEV) {
        console.log('🔄 Initializing StudentRegistrationForm with student data:', student);
        console.log('📞 Contact field:', student.contact || student.phone || student.phoneNumber || 'Not set');
        console.log('📅 Schedule:', student.schedule);
      }
      setFormData({
        fullName: student.fullName || student.name || '',
        parentName: student.parentName || '',
        email: student.email || '',
        contact: student.contact || student.phoneNumber || student.contactNumber || '',
        program: student.program || 'Full Time HQ' as ProgramType,
        tuitionFee: typeof student.tuitionFee === 'number' && !isNaN(student.tuitionFee) ? student.tuitionFee : (typeof student.tuitionFee === 'string' && student.tuitionFee ? parseFloat(student.tuitionFee) || 500 : 500),
        registrationAmount: typeof student.registrationAmount === 'number' && !isNaN(student.registrationAmount) ? student.registrationAmount : (typeof student.registrationAmount === 'string' && student.registrationAmount ? parseFloat(student.registrationAmount) || 100 : 100),
        assignedTeacher: student.assignedTeacher || student.assignedTeacherId || '',
        scheduleDays: Array.isArray(student.schedule?.days) ? student.schedule.days : (Array.isArray(student.schedule?.workingDays) ? student.schedule.workingDays : []) as ScheduleDay[],
        startTime: student.schedule?.startTime || student.schedule?.workingHours?.start || '09:00',
        endTime: student.schedule?.endTime || student.schedule?.workingHours?.end || '12:00',
      });
      setSiblings(Array.isArray(student.siblings) ? student.siblings : []);
    } else if (!isEdit && !student) {
      // Only reset form when explicitly adding a new student (not editing)
      setFormData({
        fullName: '',
        parentName: '',
        email: '',
        contact: '',
        program: 'Full Time HQ',
        tuitionFee: 500,
        registrationAmount: 100,
        assignedTeacher: '',
        scheduleDays: [],
        startTime: '09:00',
        endTime: '12:00',
      });
      setSiblings([]);
    }
  }, [isEdit, student?.id]); // Only re-run when edit mode or student ID changes

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    // Validate pair assignment (now required)
    if (!selectedPair) {
      alert('Please select a teacher pair. All students must be assigned to a teacher pair.');
      setIsSubmitting(false);
      return;
    }
    
    if (!pairSchedule.startTime || !pairSchedule.endTime) {
      alert('Please provide start and end times for the pair schedule');
      setIsSubmitting(false);
      return;
    }
    
    if (pairSchedule.days.length === 0) {
      alert('Please select at least one day for the pair schedule');
      setIsSubmitting(false);
      return;
    }
    
    setIsSubmitting(true);

    const recitationProfile: StudentRecitationProfile =
      (student?.recitationProfile as StudentRecitationProfile | undefined) ?? {
        current: {},
        history: []
      };

    // Ensure contact and schedule are properly set
    const contactValue = formData.contact?.trim() || '';
    const scheduleData = {
      days: Array.isArray(formData.scheduleDays) ? formData.scheduleDays : [],
      startTime: formData.startTime || '09:00',
      endTime: formData.endTime || '12:00',
    };

    console.log('💾 Saving student with contact:', contactValue);
    console.log('💾 Saving student with schedule:', scheduleData);

    const studentData: Student = {
      id: isEdit ? student.id : `STU${Date.now()}`,
      studentRecordId: isEdit ? student.studentRecordId : undefined,
      fullName: formData.fullName.trim(),
      parentName: formData.parentName.trim(),
      email: formData.email.trim(),
      contact: contactValue, // Ensure contact is always included
      program: formData.program,
      siblings: siblings,
      tuitionFee: formData.tuitionFee,
      registrationAmount: formData.registrationAmount,
        assignedTeacher: formData.assignedTeacher || '', // Will be set from pair
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
        // Ensure contact and schedule are included in update payload
        const { recitationProfile: _profile, studentRecordId: _recordId, ...userUpdatePayload } = studentData;
        // Explicitly ensure contact and schedule are included
        const updatePayload = {
          ...userUpdatePayload,
          contact: contactValue,
          schedule: scheduleData,
        };
        console.log('🔄 Updating student with payload:', updatePayload);
        await updateStudent(student.id, updatePayload);
        
        // Handle teacher pair assignment/update
        if (selectedPair) {
          const studentId = student.id || student._id;
          
          // Check if student already has a pair assignment
          if (pairInfo?.pairStudent?._id) {
            // Update existing pair student
            try {
              await updatePairStudent(pairInfo.pairStudent._id, {
                pair: selectedPair,
                startTime: pairSchedule.startTime,
                endTime: pairSchedule.endTime,
                days: pairSchedule.days,
                status: 'active'
              });
            } catch (error) {
              console.error('Error updating pair student:', error);
              // If update fails, try creating new one
              if (pairInfo.pairStudent._id) {
                try {
                  await deletePairStudent(pairInfo.pairStudent._id);
                } catch (e) {
                  console.error('Error deleting old pair student:', e);
                }
              }
              await createPairStudent({
                pair: selectedPair,
                student: studentId,
                startTime: pairSchedule.startTime,
                endTime: pairSchedule.endTime,
                days: pairSchedule.days,
                status: 'active'
              });
            }
          } else {
            // Create new pair student
            await createPairStudent({
              pair: selectedPair,
              student: studentId,
              startTime: pairSchedule.startTime,
              endTime: pairSchedule.endTime,
              days: pairSchedule.days,
              status: 'active'
            });
          }
        } else if (pairInfo?.pairStudent?._id) {
          // Remove from pair if pair was deselected
          try {
            await deletePairStudent(pairInfo.pairStudent._id);
          } catch (error) {
            console.error('Error removing student from pair:', error);
          }
        }
        
        // Refresh data to ensure UI updates
        if (refreshData) {
          await refreshData();
        }
        
        console.log('✅ Student updated successfully.');
        alert('✅ Student updated successfully!');
        
        // Close the form after successful update
        onClose();
        
      } else {
        const savedStudent = await addStudent(studentData);
        const studentId = savedStudent?.id || savedStudent?._id || studentData.id;
        
        // Handle teacher pair assignment for new students
        if (selectedPair && studentId) {
          try {
            await createPairStudent({
              pair: selectedPair,
              student: studentId,
              startTime: pairSchedule.startTime,
              endTime: pairSchedule.endTime,
              days: pairSchedule.days,
              status: 'active'
            });
          } catch (error) {
            console.error('Error assigning student to pair:', error);
            // Don't fail the entire student creation if pair assignment fails
            alert('Student created but failed to assign to pair. You can assign them manually later.');
          }
        }
        
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
                    // Clear pair selection if program changes and pair doesn't match
                    if (selectedPair) {
                      const currentPair = teacherPairs.find((p: any) => p._id === selectedPair);
                      if (currentPair && currentPair.program !== newProgram) {
                        setSelectedPair('');
                        setPairSchedule({ startTime: '09:00', endTime: '10:00', days: [] });
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                >
                  <option value="Full Time HQ">Full Time HQ</option>
                  <option value="Part Time HQ">Part Time HQ</option>
                  <option value="After School Reading">After School Reading</option>
                </select>
              </div>
            </div>
            
            {/* Teacher Pair Assignment */}
            <div className="mt-4">
              <h4 className="text-lg font-extrabold text-primary mb-3 flex items-center gap-2">
                <span>👥</span> Teacher Pair Assignment *
              </h4>
              <p className="text-xs text-primary/70 mb-4">
                Select a teacher pair to assign this student. Both teachers in the pair will be able to assess, evaluate, and communicate about this student.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-extrabold text-primary mb-2">
                    Select Teacher Pair *
                  </label>
                  <select
                    required
                    value={selectedPair}
                    onChange={(e) => handlePairChange(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  >
                    <option value="">Select a Teacher Pair</option>
                    {teacherPairs
                      .filter((pair: any) => {
                        // Normalize program names for comparison (handle hyphens, spaces, and variations)
                        const normalizeProgram = (p: string) => {
                          if (!p) return '';
                          return p.toLowerCase()
                            .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
                            .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
                            .trim();
                        };
                        const pairProgram = normalizeProgram(pair.program);
                        const formProgram = normalizeProgram(formData.program);
                        // Also check if form program contains pair program or vice versa (for "After School" vs "After School Reading")
                        const matches = pairProgram === formProgram || 
                                      pairProgram.includes(formProgram) || 
                                      formProgram.includes(pairProgram) ||
                                      !formData.program;
                        if (import.meta.env.DEV && formData.program) {
                          console.log(`🔍 Pair "${pair.name}": pairProgram="${pairProgram}", formProgram="${formProgram}", matches=${matches}`);
                        }
                        return matches;
                      })
                      .filter((pair: any) => pair.status === 'active')
                      .map((pair: any) => (
                        <option key={pair._id} value={pair._id}>
                          {pair.name} - {pair.teacher1?.fullName || 'Teacher 1'} & {pair.teacher2?.fullName || 'Teacher 2'} ({pair.program})
                        </option>
                      ))}
                  </select>
                  {teacherPairs.filter((pair: any) => {
                    const normalizeProgram = (p: string) => {
                      if (!p) return '';
                      return p.toLowerCase()
                        .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
                        .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
                        .trim();
                    };
                    const pairProgram = normalizeProgram(pair.program);
                    const formProgram = normalizeProgram(formData.program);
                    // Also check if form program contains pair program or vice versa (for "After School" vs "After School Reading")
                    const matches = pairProgram === formProgram || 
                                   pairProgram.includes(formProgram) || 
                                   formProgram.includes(pairProgram);
                    return matches && pair.status === 'active';
                  }).length === 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      No active teacher pairs found for {formData.program}. Please create a pair first.
                    </p>
                  )}
                </div>

                {selectedPair && (
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30 space-y-4">
                    {(() => {
                      const selectedPairData = teacherPairs.find((p: any) => p._id === selectedPair);
                      return selectedPairData ? (
                        <>
                          <div>
                            <span className="text-xs font-bold text-primary/70">Pair:</span>
                            <span className="ml-2 text-sm font-semibold text-primary">{selectedPairData.name}</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-primary/70">Teachers:</span>
                            <div className="ml-2 mt-1">
                              <div className="text-sm font-semibold text-primary">
                                • {selectedPairData.teacher1?.fullName || 'Teacher 1'}
                              </div>
                              {selectedPairData.teacher2?.fullName && (
                                <div className="text-sm font-semibold text-primary">
                                  • {selectedPairData.teacher2.fullName}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : null;
                    })()}

                    <div>
                      <label className="block text-xs font-extrabold text-primary mb-2">Pair Schedule - Start Time *</label>
                      <input
                        type="time"
                        required={!!selectedPair}
                        value={pairSchedule.startTime}
                        onChange={(e) => setPairSchedule({ ...pairSchedule, startTime: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-primary rounded-lg text-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-primary mb-2">Pair Schedule - End Time *</label>
                      <input
                        type="time"
                        required={!!selectedPair}
                        value={pairSchedule.endTime}
                        onChange={(e) => setPairSchedule({ ...pairSchedule, endTime: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-primary rounded-lg text-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-primary mb-2">Pair Schedule - Days *</label>
                      <div className="flex flex-wrap gap-2">
                        {pairDays.map(day => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => handlePairToggle(day.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition border-2 ${
                              pairSchedule.days.includes(day.value)
                                ? 'bg-primary text-accent border-primary shadow-lg'
                                : 'bg-soft-primary text-primary border-primary hover:bg-primary/20'
                            }`}
                          >
                            {day.label.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                      {pairSchedule.days.length === 0 && selectedPair && (
                        <p className="text-xs text-red-600 mt-1">Please select at least one day</p>
                      )}
                    </div>
                  </div>
                )}

                {isEdit && pairInfo && pairInfo.pair && !selectedPair && (
                  <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <p className="text-xs font-semibold text-yellow-800">
                      ⚠️ Student is currently in pair "{pairInfo.pair.name}". Deselecting will remove them from the pair.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="mb-6">
            <h3 className="text-lg font-extrabold text-primary mb-4">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Tuition Fee (Monthly) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={isNaN(formData.tuitionFee) ? '' : formData.tuitionFee}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === '' ? 0 : parseFloat(value);
                    setFormData({ ...formData, tuitionFee: isNaN(numValue) ? 0 : numValue });
                  }}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Registration Amount *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={isNaN(formData.registrationAmount) ? '' : formData.registrationAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === '' ? 0 : parseFloat(value);
                    setFormData({ ...formData, registrationAmount: isNaN(numValue) ? 0 : numValue });
                  }}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="mb-6">
            <h3 className="text-lg font-extrabold text-primary mb-4">Schedule</h3>
            <div className="mb-4">
              <label className="block text-sm font-extrabold text-primary mb-2">Days *</label>
              <div className="flex flex-wrap gap-2">
                {allDays.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-extrabold transition border-2 ${
                      formData.scheduleDays.includes(day)
                        ? 'bg-primary text-accent border-primary shadow-lg'
                        : 'bg-soft-primary text-primary border-primary hover:bg-primary/20'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Start Time *</label>
                <input
                  type="time"
                  required
                  value={formData.startTime || '09:00'}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setFormData(prev => ({ ...prev, startTime: newValue || '09:00' }));
                  }}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">End Time *</label>
                <input
                  type="time"
                  required
                  value={formData.endTime || '12:00'}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setFormData(prev => ({ ...prev, endTime: newValue || '12:00' }));
                  }}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
            </div>
          </div>
          {/* Siblings */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-extrabold text-primary">Siblings (Optional)</h3>
              <button
                type="button"
                onClick={() => setShowSiblingForm(!showSiblingForm)}
                className="px-4 py-2 bg-accent text-primary rounded-lg hover:bg-accent/90 text-sm font-extrabold shadow-lg"
              >
                + Add Sibling
              </button>
            </div>

            {showSiblingForm && (
              <div className="bg-accent/10 p-4 rounded-lg mb-4 border-2 border-accent/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <input
                    type="text"
                    placeholder="Sibling Full Name"
                    value={siblingData.fullName}
                    onChange={(e) => setSiblingData({ ...siblingData, fullName: e.target.value })}
                    className="px-4 py-2 border-2 border-primary rounded-lg text-primary bg-white"
                  />
                  <select
                    value={siblingData.program}
                    onChange={(e) => setSiblingData({ ...siblingData, program: e.target.value as ProgramType })}
                    className="px-4 py-2 border-2 border-primary rounded-lg text-primary bg-white"
                  >
                    <option value="Full Time HQ">Full Time HQ</option>
                    <option value="Part Time HQ">Part Time HQ</option>
                    <option value="After School Reading">After School Reading</option>
                  </select>
                  <select
                    value={siblingData.assignedTeacher}
                    onChange={(e) => setSiblingData({ ...siblingData, assignedTeacher: e.target.value })}
                    className="px-4 py-2 border-2 border-primary rounded-lg text-primary bg-white"
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
                  className="px-4 py-2 bg-accent text-primary rounded-lg hover:bg-accent/90 text-sm font-extrabold shadow-lg"
                >
                  Add This Sibling
                </button>
              </div>
            )}

            {siblings.length > 0 && (
              <div className="space-y-2">
                {siblings.map((sibling, index) => (
                  <div key={sibling.id} className="flex justify-between items-center bg-soft-primary p-3 rounded-lg border-2 border-primary">
                    <div>
                      <p className="font-extrabold text-primary">{sibling.fullName}</p>
                      <p className="text-sm text-primary">{sibling.program}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSiblings(siblings.filter((_, i) => i !== index))}
                      className="text-primary hover:text-primary/70 font-extrabold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
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
