import React, { useState, useEffect } from 'react';
import { Teacher, TeacherAttendance, AttendanceStatus } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

// Helper function to get teacher shift times (moved outside component for reuse)
const getTeacherShiftTimes = (teacher: Teacher) => {
  const isFullTime = teacher.employmentType === 'Full Time';
  
  if (isFullTime) {
    // Get from fullTimeSchedule or schedule or shifts
    const fullTimeSchedule = (teacher.schedule as any)?.fullTimeSchedule;
    const morningStart = fullTimeSchedule?.morningShift?.startTime || 
                        teacher.shifts?.find((s: any) => s.name?.toLowerCase().includes('morning'))?.startTime ||
                        '09:00';
    const morningEnd = fullTimeSchedule?.morningShift?.endTime || 
                      teacher.shifts?.find((s: any) => s.name?.toLowerCase().includes('morning'))?.endTime ||
                      '12:00';
    const eveningStart = fullTimeSchedule?.eveningShift?.startTime || 
                        teacher.shifts?.find((s: any) => s.name?.toLowerCase().includes('evening'))?.startTime ||
                        '18:00';
    const eveningEnd = fullTimeSchedule?.eveningShift?.endTime || 
                      teacher.shifts?.find((s: any) => s.name?.toLowerCase().includes('evening'))?.endTime ||
                      '21:00';
    
    return { morningStart, morningEnd, eveningStart, eveningEnd };
  } else {
    // Part Time - get from shifts or schedule
    const shift = teacher.shifts?.[0];
    const startTime = shift?.startTime || 
                     (teacher.schedule as any)?.workingHours?.start || 
                     (teacher.schedule as any)?.startTime || 
                     '09:00';
    const endTime = shift?.endTime || 
                   (teacher.schedule as any)?.workingHours?.end || 
                   (teacher.schedule as any)?.endTime || 
                   '17:00';
    
    return { startTime, endTime };
  }
};

interface TeacherAttendanceFormProps {
  onClose: () => void;
  selectedDate?: string; // YYYY-MM-DD format
  selectedTeacherId?: string; // Optional, for single teacher
  attendanceToEdit?: TeacherAttendance; // Optional, for editing existing attendance
}

const TeacherAttendanceForm: React.FC<TeacherAttendanceFormProps> = ({ 
  onClose, 
  selectedDate,
  selectedTeacherId,
  attendanceToEdit
}) => {
  const { teachers } = useData();
  const { user } = useAuth();
  const [selectedDateState, setSelectedDateState] = useState(
    attendanceToEdit?.date || selectedDate || new Date().toISOString().split('T')[0]
  );
  const [filterEmploymentType, setFilterEmploymentType] = useState<'all' | 'Full Time' | 'Part Time'>('all');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Partial<TeacherAttendance>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paidDays, setPaidDays] = useState<Record<string, number>>({});
  const [isPaid, setIsPaid] = useState<Record<string, boolean>>({});
  const [savingTeacherId, setSavingTeacherId] = useState<string | null>(null);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);

  // Filter teachers based on employment type
  const filteredTeachers = teachers.filter(teacher => {
    if (filterEmploymentType === 'all') return true;
    const empType = teacher.employmentType === 'Full Time' ? 'Full Time' : 'Part Time';
    return empType === filterEmploymentType;
  });

  // Load existing attendance for the selected date or edit mode
  useEffect(() => {
    // If editing, pre-fill the form with attendance data
    if (attendanceToEdit) {
      const teacher = teachers.find(t => {
        const tid = (t as any)._id?.toString() || (t as any).teacherDocumentId || t.id;
        return tid === attendanceToEdit.teacherId;
      });
      
      if (teacher) {
        const teacherId = (teacher as any)._id?.toString() || (teacher as any).teacherDocumentId || teacher.id;
        const record: Partial<TeacherAttendance> = {};
        
        if (attendanceToEdit.employmentType === 'Full Time') {
          record.morningShift = attendanceToEdit.morningShift;
          record.eveningShift = attendanceToEdit.eveningShift;
        } else {
          record.shift = attendanceToEdit.shift;
        }
        
        setAttendanceRecords({ [teacherId]: record });
        setPaidDays({ [teacherId]: attendanceToEdit.paidDays || 0 });
        setIsPaid({ [teacherId]: attendanceToEdit.isPaid || false });
        setSelectedDateState(attendanceToEdit.date);
        
        // Set selected teacher if provided
        if (selectedTeacherId) {
          // Already set
        }
      }
      return; // Don't load from API if editing
    }
    
    const loadExistingAttendance = async () => {
      try {
        const token = localStorage.getItem('umar_academy_token');
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance?date=${selectedDateState}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const existingRecords: TeacherAttendance[] = await response.json();
          const recordsMap: Record<string, Partial<TeacherAttendance>> = {};
          const paidDaysMap: Record<string, number> = {};
          const isPaidMap: Record<string, boolean> = {};

          existingRecords.forEach(record => {
            // Match teacher by Teacher document _id (which is stored in record.teacherId)
            // The backend saves attendance with teacherId = Teacher._id (not User._id)
            const teacher = teachers.find(t => {
              // Priority: teacherDocumentId > _id (if different from id) > id
              const teacherDocId = (t as any).teacherDocumentId?.toString() || 
                                   ((t as any)._id && (t as any)._id.toString() !== t.id?.toString() ? (t as any)._id.toString() : null) ||
                                   null;
              // Match by Teacher document _id (what's stored in record.teacherId)
              return teacherDocId === record.teacherId || 
                     (t as any)._id?.toString() === record.teacherId ||
                     t.id === record.teacherId;
            });
            if (teacher) {
              // Ensure times are set if missing
              const times = getTeacherShiftTimes(teacher);
              if (record.employmentType === 'Full Time') {
                recordsMap[teacher.id] = {
                  ...record,
                  id: (record as any).id || (record as any)._id, // Preserve attendance record ID for delete
                  morningShift: {
                    status: (record.morningShift?.status || 'absent') as AttendanceStatus,
                    checkIn: record.morningShift?.checkIn || (record.morningShift?.status === 'present' ? times.morningStart : ''),
                    checkOut: record.morningShift?.checkOut || (record.morningShift?.status === 'present' ? times.morningEnd : ''),
                    notes: record.morningShift?.notes || ''
                  },
                  eveningShift: {
                    status: (record.eveningShift?.status || 'absent') as AttendanceStatus,
                    checkIn: record.eveningShift?.checkIn || (record.eveningShift?.status === 'present' ? times.eveningStart : ''),
                    checkOut: record.eveningShift?.checkOut || (record.eveningShift?.status === 'present' ? times.eveningEnd : ''),
                    notes: record.eveningShift?.notes || ''
                  }
                };
              } else {
                recordsMap[teacher.id] = {
                  ...record,
                  id: (record as any).id || (record as any)._id, // Preserve attendance record ID for delete
                  shift: {
                    name: record.shift?.name || teacher.shifts?.[0]?.name || 'Default',
                    status: (record.shift?.status || 'absent') as AttendanceStatus,
                    checkIn: record.shift?.checkIn || (record.shift?.status === 'present' ? times.startTime : ''),
                    checkOut: record.shift?.checkOut || (record.shift?.status === 'present' ? times.endTime : ''),
                    notes: record.shift?.notes || ''
                  }
                };
              }
              paidDaysMap[teacher.id] = record.paidDays || 0;
              isPaidMap[teacher.id] = record.isPaid || false;
            }
          });

          setAttendanceRecords(recordsMap);
          setPaidDays(paidDaysMap);
          setIsPaid(isPaidMap);
        }
      } catch (error) {
        console.error('Error loading existing attendance:', error);
      }
    };

    loadExistingAttendance();
  }, [selectedDateState, teachers]);

  const updateAttendance = (teacherId: string, field: string, value: any) => {
    setAttendanceRecords(prev => {
      const current = prev[teacherId] || {};
      const teacher = teachers.find(t => t.id === teacherId);
      const isFullTime = teacher?.employmentType === 'Full Time';

      if (isFullTime) {
        // Full Time teacher - update morning or evening shift
        if (field.startsWith('morning')) {
          const shiftField = field.replace('morning', '').toLowerCase();
          return {
            ...prev,
            [teacherId]: {
              ...current,
              morningShift: {
                ...(current.morningShift || { status: 'absent' as AttendanceStatus }),
                [shiftField]: value
              }
            }
          };
        } else if (field.startsWith('evening')) {
          const shiftField = field.replace('evening', '').toLowerCase();
          return {
            ...prev,
            [teacherId]: {
              ...current,
              eveningShift: {
                ...(current.eveningShift || { status: 'absent' as AttendanceStatus }),
                [shiftField]: value
              }
            }
          };
        }
      } else {
        // Part Time teacher - update single shift
        if (field.startsWith('shift')) {
          const shiftField = field.replace('shift', '').toLowerCase();
          return {
            ...prev,
            [teacherId]: {
              ...current,
              shift: {
                ...(current.shift || { name: teacher?.shifts?.[0]?.name || 'Default', status: 'absent' as AttendanceStatus }),
                [shiftField]: value
              }
            }
          };
        }
      }

      return { ...prev, [teacherId]: { ...current, [field]: value } };
    });
  };


  const handleBulkAction = (action: 'present' | 'absent') => {
    const newRecords = { ...attendanceRecords };
    filteredTeachers.forEach(teacher => {
      const isFullTime = teacher.employmentType === 'Full Time';
      if (isFullTime) {
        const times = getTeacherShiftTimes(teacher);
        newRecords[teacher.id] = {
          ...newRecords[teacher.id],
          morningShift: {
            status: action as AttendanceStatus,
            checkIn: action === 'present' ? times.morningStart : '',
            checkOut: action === 'present' ? times.morningEnd : '',
            notes: ''
          },
          eveningShift: {
            status: action as AttendanceStatus,
            checkIn: action === 'present' ? times.eveningStart : '',
            checkOut: action === 'present' ? times.eveningEnd : '',
            notes: ''
          }
        };
      } else {
        const times = getTeacherShiftTimes(teacher);
        newRecords[teacher.id] = {
          ...newRecords[teacher.id],
          shift: {
            name: teacher.shifts?.[0]?.name || 'Default',
            status: action as AttendanceStatus,
            checkIn: action === 'present' ? times.startTime : '',
            checkOut: action === 'present' ? times.endTime : '',
            notes: ''
          }
        };
      }
    });
    setAttendanceRecords(newRecords);
  };

  // Save individual teacher attendance
  const handleSaveIndividual = async (teacherId: string) => {
    if (!user) return;

    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    setSavingTeacherId(teacherId);
    try {
      const token = localStorage.getItem('umar_academy_token');
      const record = attendanceRecords[teacherId] || {};
      const isFullTime = teacher.employmentType === 'Full Time';
      // REDESIGNED: Always use Teacher document _id (not User._id)
      // The backend expects Teacher._id, not User._id
      // Priority: teacherDocumentId > _id (if different from id) > error (don't use User._id)
      let teacherIdForApi: string | null = null;
      
      // First priority: teacherDocumentId (explicitly set Teacher document _id)
      if ((teacher as any).teacherDocumentId) {
        teacherIdForApi = (teacher as any).teacherDocumentId.toString();
      } 
      // Second priority: _id if it's different from id (id = User._id, _id = Teacher._id)
      else if ((teacher as any)._id && (teacher as any)._id.toString() !== teacher.id?.toString()) {
        teacherIdForApi = (teacher as any)._id.toString();
      }
      // If we can't find Teacher._id, show error - don't send User._id
      else {
        console.error('❌ Cannot find Teacher document _id!', {
          teacherName: teacher.fullName,
          teacherId: teacher.id, // User._id
          _id: (teacher as any)._id,
          teacherDocumentId: (teacher as any).teacherDocumentId,
          userId: (teacher as any).userId
        });
        alert(`❌ Error: Cannot find Teacher document ID for ${teacher.fullName}. Please refresh the page and try again.`);
        return;
      }

      console.log('✅ Using Teacher document _id:', {
        teacherName: teacher.fullName,
        teacherDocumentId: teacherIdForApi,
        userDocumentId: teacher.id, // For reference
        note: 'Backend will use Teacher._id to find teacher'
      });

      const attendanceData = {
        teacherId: teacherIdForApi,
        date: selectedDateState,
        paidDays: paidDays[teacherId] || 0,
        isPaid: isPaid[teacherId] || false,
        ...(isFullTime
          ? {
              morningShift: record.morningShift || {
                status: 'absent' as AttendanceStatus,
                checkIn: '',
                checkOut: '',
                notes: ''
              },
              eveningShift: record.eveningShift || {
                status: 'absent' as AttendanceStatus,
                checkIn: '',
                checkOut: '',
                notes: ''
              }
            }
          : {
              shift: record.shift || {
                name: teacher.shifts?.[0]?.name || 'Default',
                status: 'absent' as AttendanceStatus,
                checkIn: '',
                checkOut: '',
                notes: ''
              }
            })
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(attendanceData)
        }
      );

      if (response.ok) {
        alert(`✅ Attendance saved successfully for ${teacher.fullName}!`);
        // Reload existing attendance to refresh the form
        const loadResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance?date=${selectedDateState}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (loadResponse.ok) {
          const existingRecords: TeacherAttendance[] = await loadResponse.json();
          const recordsMap: Record<string, Partial<TeacherAttendance>> = {};
          const paidDaysMap: Record<string, number> = {};
          const isPaidMap: Record<string, boolean> = {};

          existingRecords.forEach(record => {
            const t = teachers.find(t => {
              const tid = (t as any)._id?.toString() || t.id;
              return tid === record.teacherId || record.teacherId === t.id;
            });
            if (t) {
              const times = getTeacherShiftTimes(t);
              if (record.employmentType === 'Full Time') {
                recordsMap[t.id] = {
                  ...record,
                  morningShift: {
                    status: (record.morningShift?.status || 'absent') as AttendanceStatus,
                    checkIn: record.morningShift?.checkIn || (record.morningShift?.status === 'present' ? times.morningStart : ''),
                    checkOut: record.morningShift?.checkOut || (record.morningShift?.status === 'present' ? times.morningEnd : ''),
                    notes: record.morningShift?.notes || ''
                  },
                  eveningShift: {
                    status: (record.eveningShift?.status || 'absent') as AttendanceStatus,
                    checkIn: record.eveningShift?.checkIn || (record.eveningShift?.status === 'present' ? times.eveningStart : ''),
                    checkOut: record.eveningShift?.checkOut || (record.eveningShift?.status === 'present' ? times.eveningEnd : ''),
                    notes: record.eveningShift?.notes || ''
                  }
                };
              } else {
                recordsMap[t.id] = {
                  ...record,
                  shift: {
                    name: record.shift?.name || teacher.shifts?.[0]?.name || 'Default',
                    status: (record.shift?.status || 'absent') as AttendanceStatus,
                    checkIn: record.shift?.checkIn || (record.shift?.status === 'present' ? times.startTime : ''),
                    checkOut: record.shift?.checkOut || (record.shift?.status === 'present' ? times.endTime : ''),
                    notes: record.shift?.notes || ''
                  }
                };
              }
              paidDaysMap[t.id] = record.paidDays || 0;
              isPaidMap[t.id] = record.isPaid || false;
            }
          });

          setAttendanceRecords(recordsMap);
          setPaidDays(paidDaysMap);
          setIsPaid(isPaidMap);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving individual attendance:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to save attendance'}`);
    } finally {
      setSavingTeacherId(null);
    }
  };

  // Delete individual teacher attendance
  const handleDeleteIndividual = async (teacherId: string, attendanceId?: string) => {
    if (!user) return;

    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    if (!attendanceId) {
      // Try to find the attendance record ID
      const record = attendanceRecords[teacherId];
      if (!record || !(record as any).id && !(record as any)._id) {
        alert('❌ Cannot delete: Attendance record not found. Please refresh and try again.');
        return;
      }
      attendanceId = (record as any).id || (record as any)._id;
    }

    const confirmed = window.confirm(`Are you sure you want to delete attendance for ${teacher.fullName} on ${selectedDateState}?`);
    if (!confirmed) return;

    setDeletingTeacherId(teacherId);
    try {
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance/${attendanceId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        alert(`✅ Attendance deleted successfully for ${teacher.fullName}!`);
        // Remove from local state
        const newRecords = { ...attendanceRecords };
        delete newRecords[teacherId];
        setAttendanceRecords(newRecords);
        const newPaidDays = { ...paidDays };
        delete newPaidDays[teacherId];
        setPaidDays(newPaidDays);
        const newIsPaid = { ...isPaid };
        delete newIsPaid[teacherId];
        setIsPaid(newIsPaid);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete attendance');
      }
    } catch (error) {
      console.error('Error deleting attendance:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to delete attendance'}`);
    } finally {
      setDeletingTeacherId(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('umar_academy_token');
        const attendances = filteredTeachers.map(teacher => {
        // Use Teacher document _id if available, otherwise fall back to other IDs
        // Priority: teacherDocumentId > _id > id (user._id) > userId
        const teacherId = (teacher as any).teacherDocumentId?.toString() ||
                         (teacher as any)._id?.toString() || 
                         teacher.id?.toString() || 
                         (teacher as any).userId?.toString();
        const record = attendanceRecords[teacher.id] || {};
        const isFullTime = teacher.employmentType === 'Full Time';

        console.log(`📝 Preparing attendance for teacher: ${teacher.fullName}, ID: ${teacherId}, teacher.id: ${teacher.id}, teacherDocumentId: ${(teacher as any).teacherDocumentId}`);

        return {
          teacherId: teacherId,
          date: selectedDateState,
          paidDays: paidDays[teacher.id] || 0,
          isPaid: isPaid[teacher.id] || false,
          ...(isFullTime
            ? {
                morningShift: record.morningShift || {
                  status: 'absent' as AttendanceStatus,
                  checkIn: '',
                  checkOut: '',
                  notes: ''
                },
                eveningShift: record.eveningShift || {
                  status: 'absent' as AttendanceStatus,
                  checkIn: '',
                  checkOut: '',
                  notes: ''
                }
              }
            : {
                shift: record.shift || {
                  name: teacher.shifts?.[0]?.name || 'Default',
                  status: 'absent' as AttendanceStatus,
                  checkIn: '',
                  checkOut: '',
                  notes: ''
                }
              })
        };
      });

      const payload = {
        date: selectedDateState,
        attendances
      };

      console.log('📤 Submitting attendance:', {
        date: selectedDateState,
        teacherCount: attendances.length,
        teachers: attendances.map(a => ({ teacherId: a.teacherId }))
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance/bulk`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.errors && result.errors.length > 0) {
          const errorMessages = result.errors.map((e: any) => 
            `Teacher ${e.teacherId}: ${e.error}`
          ).join('\n');
          alert(`⚠️ Attendance saved with some errors:\n\n${errorMessages}\n\n${result.created} records saved successfully.`);
        } else {
          alert(`✅ Attendance saved successfully for ${result.created || attendances.length} teacher(s)!`);
        }
        onClose();
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        throw new Error(error.error || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to save attendance'}\n\nPlease check the browser console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    const colors = {
      present: 'bg-green-100 text-green-800 border-green-300',
      absent: 'bg-red-100 text-red-800 border-red-300',
      late: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'half-day': 'bg-orange-100 text-orange-800 border-orange-300'
    };
    return colors[status] || colors.absent;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full my-8 border-2 border-primary">
        <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] p-6 rounded-t-lg">
          <h2 className="text-2xl font-extrabold text-accent">Take Teacher Attendance</h2>
          <p className="text-accent/90 text-sm mt-1">Record attendance for {selectedDateState}</p>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* Date and Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-extrabold text-primary mb-2">Date</label>
              <input
                type="date"
                value={selectedDateState}
                onChange={(e) => setSelectedDateState(e.target.value)}
                className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-primary mb-2">Employment Type</label>
              <select
                value={filterEmploymentType}
                onChange={(e) => setFilterEmploymentType(e.target.value as any)}
                className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
              >
                <option value="all">All Teachers</option>
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => handleBulkAction('present')}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-extrabold"
              >
                Mark All Present
              </button>
              <button
                onClick={() => handleBulkAction('absent')}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-extrabold"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {/* Attendance List */}
          <div className="space-y-4">
            {filteredTeachers.length === 0 ? (
              <div className="text-center py-8 text-primary">
                <p>No teachers found for the selected filters.</p>
              </div>
            ) : (
              filteredTeachers.map(teacher => {
                const isFullTime = teacher.employmentType === 'Full Time';
                const record = attendanceRecords[teacher.id] || {};
                const morningShift = record.morningShift || { status: 'absent' as AttendanceStatus };
                const eveningShift = record.eveningShift || { status: 'absent' as AttendanceStatus };
                const shift = record.shift || { 
                  name: teacher.shifts?.[0]?.name || 'Default', 
                  status: 'absent' as AttendanceStatus 
                };

                return (
                  <div
                    key={teacher.id}
                    className="border-2 border-primary rounded-lg p-4 bg-soft-primary"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-extrabold text-primary text-lg">{teacher.fullName}</h3>
                        <p className="text-sm text-primary/70">
                          {teacher.employmentType} • {teacher.department}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <div className="flex gap-2 items-center">
                          <label className="text-sm font-semibold text-primary">Paid Days:</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={paidDays[teacher.id] || 0}
                            onChange={(e) => setPaidDays(prev => ({
                              ...prev,
                              [teacher.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-20 px-2 py-1 border border-primary rounded text-primary"
                          />
                          <label className="text-sm font-semibold text-primary flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isPaid[teacher.id] || false}
                              onChange={(e) => setIsPaid(prev => ({
                                ...prev,
                                [teacher.id]: e.target.checked
                              }))}
                              className="w-4 h-4"
                            />
                            Paid
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveIndividual(teacher.id)}
                            disabled={savingTeacherId === teacher.id || isSubmitting}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Save this teacher's attendance"
                          >
                            {savingTeacherId === teacher.id ? 'Saving...' : '💾 Save'}
                          </button>
                          {(attendanceRecords[teacher.id] as any)?.id || (attendanceRecords[teacher.id] as any)?._id ? (
                            <button
                              onClick={() => handleDeleteIndividual(teacher.id)}
                              disabled={deletingTeacherId === teacher.id || isSubmitting}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete this teacher's attendance"
                            >
                              {deletingTeacherId === teacher.id ? 'Deleting...' : '🗑️ Delete'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {isFullTime ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Morning Shift */}
                        <div className="border border-primary/30 rounded-lg p-3 bg-white">
                          <h4 className="font-extrabold text-primary mb-2">
                            Morning Shift
                            {(() => {
                              const times = getTeacherShiftTimes(teacher);
                              return times.morningStart && times.morningEnd ? 
                                ` (${times.morningStart} - ${times.morningEnd})` : '';
                            })()}
                          </h4>
                          <div className="space-y-2">
                            <select
                              value={morningShift.status}
                              onChange={(e) => updateAttendance(teacher.id, 'morningstatus', e.target.value)}
                              className={`w-full px-3 py-2 rounded border-2 ${getStatusColor(morningShift.status)}`}
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                              <option value="half-day">Half Day</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-primary/70 mb-1 block">Check In</label>
                                <input
                                  type="time"
                                  value={morningShift.checkIn || getTeacherShiftTimes(teacher).morningStart}
                                  onChange={(e) => updateAttendance(teacher.id, 'morningCheckIn', e.target.value)}
                                  placeholder="Check In"
                                  className="w-full px-2 py-1 border border-primary rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-primary/70 mb-1 block">Check Out</label>
                                <input
                                  type="time"
                                  value={morningShift.checkOut || getTeacherShiftTimes(teacher).morningEnd}
                                  onChange={(e) => updateAttendance(teacher.id, 'morningCheckOut', e.target.value)}
                                  placeholder="Check Out"
                                  className="w-full px-2 py-1 border border-primary rounded text-sm"
                                />
                              </div>
                            </div>
                            <textarea
                              value={morningShift.notes || ''}
                              onChange={(e) => updateAttendance(teacher.id, 'morningNotes', e.target.value)}
                              placeholder="Notes..."
                              className="w-full px-2 py-1 border border-primary rounded text-sm"
                              rows={2}
                            />
                          </div>
                        </div>

                        {/* Evening Shift */}
                        <div className="border border-primary/30 rounded-lg p-3 bg-white">
                          <h4 className="font-extrabold text-primary mb-2">
                            Evening Shift
                            {(() => {
                              const times = getTeacherShiftTimes(teacher);
                              return times.eveningStart && times.eveningEnd ? 
                                ` (${times.eveningStart} - ${times.eveningEnd})` : '';
                            })()}
                          </h4>
                          <div className="space-y-2">
                            <select
                              value={eveningShift.status}
                              onChange={(e) => updateAttendance(teacher.id, 'eveningstatus', e.target.value)}
                              className={`w-full px-3 py-2 rounded border-2 ${getStatusColor(eveningShift.status)}`}
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                              <option value="half-day">Half Day</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-primary/70 mb-1 block">Check In</label>
                                <input
                                  type="time"
                                  value={eveningShift.checkIn || getTeacherShiftTimes(teacher).eveningStart}
                                  onChange={(e) => updateAttendance(teacher.id, 'eveningCheckIn', e.target.value)}
                                  placeholder="Check In"
                                  className="w-full px-2 py-1 border border-primary rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-primary/70 mb-1 block">Check Out</label>
                                <input
                                  type="time"
                                  value={eveningShift.checkOut || getTeacherShiftTimes(teacher).eveningEnd}
                                  onChange={(e) => updateAttendance(teacher.id, 'eveningCheckOut', e.target.value)}
                                  placeholder="Check Out"
                                  className="w-full px-2 py-1 border border-primary rounded text-sm"
                                />
                              </div>
                            </div>
                            <textarea
                              value={eveningShift.notes || ''}
                              onChange={(e) => updateAttendance(teacher.id, 'eveningNotes', e.target.value)}
                              placeholder="Notes..."
                              className="w-full px-2 py-1 border border-primary rounded text-sm"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-primary/30 rounded-lg p-3 bg-white">
                        <h4 className="font-extrabold text-primary mb-2">
                          Shift: {shift.name}
                          {(() => {
                            const times = getTeacherShiftTimes(teacher);
                            return times.startTime && times.endTime ? 
                              ` (${times.startTime} - ${times.endTime})` : '';
                          })()}
                        </h4>
                        <div className="space-y-2">
                          <select
                            value={shift.status}
                            onChange={(e) => updateAttendance(teacher.id, 'shiftstatus', e.target.value)}
                            className={`w-full px-3 py-2 rounded border-2 ${getStatusColor(shift.status)}`}
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="half-day">Half Day</option>
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-primary/70 mb-1 block">Check In</label>
                              <input
                                type="time"
                                value={shift.checkIn || getTeacherShiftTimes(teacher).startTime}
                                onChange={(e) => updateAttendance(teacher.id, 'shiftCheckIn', e.target.value)}
                                placeholder="Check In"
                                className="w-full px-2 py-1 border border-primary rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-primary/70 mb-1 block">Check Out</label>
                              <input
                                type="time"
                                value={shift.checkOut || getTeacherShiftTimes(teacher).endTime}
                                onChange={(e) => updateAttendance(teacher.id, 'shiftCheckOut', e.target.value)}
                                placeholder="Check Out"
                                className="w-full px-2 py-1 border border-primary rounded text-sm"
                              />
                            </div>
                          </div>
                          <textarea
                            value={shift.notes || ''}
                            onChange={(e) => updateAttendance(teacher.id, 'shiftNotes', e.target.value)}
                            placeholder="Notes..."
                            className="w-full px-2 py-1 border border-primary rounded text-sm"
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 mt-6 border-t-2 border-primary bg-gray-50 p-6 -mx-6 -mb-6">
            <div className="text-sm text-primary/70">
              💡 Tip: You can save individual teachers or save all at once
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border-2 border-primary rounded-lg hover:bg-primary/10 font-extrabold text-primary shadow-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-accent rounded-lg hover:bg-primary/90 font-extrabold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-105 transition-all"
              >
                {isSubmitting ? 'Saving All...' : '💾 Save All Teachers'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendanceForm;

