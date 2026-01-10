import React, { useState } from 'react';
import { Teacher, ScheduleDay, TeacherPermissions, EmploymentType, ShiftType, Shift, TeacherLocation, Currency } from '../types';
import { useData } from '../contexts/DataContext';

interface TeacherRegistrationFormProps {
  onClose: () => void;
  teacher?: any;
  isEdit?: boolean;
}

const TeacherRegistrationForm: React.FC<TeacherRegistrationFormProps> = ({ onClose, teacher, isEdit = false }) => {
  const { addTeacher, updateTeacher, refreshData } = useData();
  const [currentTab, setCurrentTab] = useState(0);
  
  // SVG pattern for header background
  const headerPattern = "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";
  
  // Personal Information - initialize with teacher data if editing
  const [personalInfo, setPersonalInfo] = useState({
    fullName: teacher?.fullName || '',
    email: teacher?.email || '',
    phoneNumber: teacher?.phoneNumber || '',
    emergencyContact: teacher?.emergencyContact || '',
    department: teacher?.department || '',
    location: (teacher?.location || 'Local') as TeacherLocation,
  });

  // Employment & Scheduling
  const [employmentInfo, setEmploymentInfo] = useState({
    employmentType: 'Full Time' as EmploymentType,
    shiftType: 'Morning' as ShiftType,
    scheduleDays: [] as ScheduleDay[],
  });

  const [shifts, setShifts] = useState<Shift[]>([
    { name: 'Morning Shift', startTime: '08:00', endTime: '12:00' },
    { name: 'Afternoon Shift', startTime: '13:00', endTime: '17:00' },
  ]);

  // Schedule configuration
  // For Full Time: Mon-Sat with morning and evening shifts
  // For Part Time: Individual day schedules
  const [fullTimeSchedule, setFullTimeSchedule] = useState({
    morningShift: { startTime: '08:00', endTime: '12:00' },
    eveningShift: { startTime: '13:00', endTime: '17:00' },
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as ScheduleDay[],
  });

  // For Part Time teachers
  const [partTimeDaySchedules, setPartTimeDaySchedules] = useState<Array<{
    day: ScheduleDay;
    startTime: string;
    endTime: string;
  }>>([]);

  // Form for adding a new day (Part Time)
  const [newPartTimeDay, setNewPartTimeDay] = useState({
    day: 'Monday' as ScheduleDay,
    startTime: '08:00',
    endTime: '12:00',
  });

  // Payroll Information
  const [payrollInfo, setPayrollInfo] = useState({
    hourlyRate: 25,
    dailyHours: 8,
    daysWorking: 22,
  });

  // ID Document
  const [idDocument, setIdDocument] = useState<string>('');

  // Permissions
  const [permissions, setPermissions] = useState<TeacherPermissions>({
    // Assessments & Evaluations
    canViewAssessments: true,
    canEditAssessments: true,
    canViewEvaluations: true,
    canEditEvaluations: true,
    
    // Financial & Billing
    canViewFinancials: false,
    
    // Scheduling & Logistics
    canManageSchedule: true,
    
    // Communication
    canContactParents: true,
    
    // Student Information
    canViewStudentEmail: true,
    canViewStudentContact: true,
    canViewStudentPersonalInfo: true,
    
    // Module Permissions - Messages
    canAccessMessages: true,
    canSendMessages: true,
    canViewAllMessages: false,
    
    // Module Permissions - PDF
    canAccessPdf: true,
    canUploadPdf: false,
    canAnnotatePdf: true,
    canViewPdfAnnotations: true,
    
    // Module Permissions - Homework
    canAccessHomework: true,
    canCreateHomework: true,
    canGradeHomework: true,
    canViewHomeworkSubmissions: true,
    
    // Module Permissions - Evaluation
    canAccessEvaluations: true,
    canCreateEvaluations: false,
    canReviewEvaluations: false,
    canApproveEvaluations: false,
    
    // Module Permissions - Tickets
    canAccessTickets: true,
    canCreateTickets: false,
    canReviewTickets: true,
    canApproveTickets: false,
    canFinalizeTickets: false,
    
    // Module Permissions - Attendance
    canAccessAttendance: true,
    canRecordAttendance: true,
    canViewAttendanceReports: true,
    
    // Module Permissions - Recordings
    canAccessRecordings: true,
    canUploadRecordings: true,
    canDeleteRecordings: false,
    canViewAllRecordings: false,
    
    // Module Permissions - Mushaf
    canAccessMushaf: true,
    canMarkMistakes: true,
    canViewMistakeHistory: true,
    canManageMistakeLibrary: false,
    
    // Module Permissions - Qaidah
    canAccessQaidah: true,
    canManageQaidah: false,
    canViewQaidahProgress: true,
    
    // Module Permissions - Assignments
    canAccessAssignments: true,
    canCreateAssignments: true,
    canEditAssignments: false,
    canDeleteAssignments: false,
    
    // Teacher-Student Assignment
    canManageStudentAssignments: false,
    
    // Module Permissions - Reports & Analytics
    canViewReports: true,
    canViewAnalytics: true,
    canExportReports: false,
  });

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const allDays: ScheduleDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Get currency based on location
  const currency: Currency = personalInfo.location === 'Local' ? 'USD' : 'PKR';
  const currencySymbol = currency === 'USD' ? '$' : 'Rs';

  // Auto-calculate monthly hours and salary
  const monthlyHours = payrollInfo.dailyHours * payrollInfo.daysWorking;
  const monthlySalary = payrollInfo.hourlyRate * monthlyHours;

  const handleDayToggle = (day: ScheduleDay) => {
    setEmploymentInfo(prev => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter(d => d !== day)
        : [...prev.scheduleDays, day]
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for demo purposes
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdDocument(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEmploymentTypeChange = (type: EmploymentType) => {
    setEmploymentInfo(prev => ({ ...prev, employmentType: type }));
    
    if (type === 'Full Time') {
      // Full time: 2 shifts (morning and evening), Mon-Sat
      setEmploymentInfo(prev => ({ ...prev, shiftType: 'Both' }));
      setShifts([
        { name: 'Morning Shift', startTime: '08:00', endTime: '12:00' },
        { name: 'Evening Shift', startTime: '13:00', endTime: '17:00' },
      ]);
      // Preserve existing schedule if editing, otherwise use defaults
      if (!isEdit || !fullTimeSchedule.workingDays.length) {
        setFullTimeSchedule({
          morningShift: { startTime: '08:00', endTime: '12:00' },
          eveningShift: { startTime: '13:00', endTime: '17:00' },
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        });
      }
      // Only update payroll defaults if not editing or if payroll is empty
      if (!isEdit || !payrollInfo.hourlyRate) {
        setPayrollInfo(prev => ({ ...prev, dailyHours: 8, daysWorking: 22 }));
      }
      // Clear part time schedules when switching to full time
      setPartTimeDaySchedules([]);
    } else {
      // Part time: one shift, flexible days
      setShifts([{ name: 'Morning Shift', startTime: '08:00', endTime: '12:00' }]);
      // Preserve existing part time schedules if editing, otherwise clear
      if (!isEdit || partTimeDaySchedules.length === 0) {
        setPartTimeDaySchedules([]);
      }
      // Only update payroll defaults if not editing or if payroll is empty
      if (!isEdit || !payrollInfo.hourlyRate) {
        setPayrollInfo(prev => ({ ...prev, dailyHours: 4, daysWorking: 22 }));
      }
      // Clear full time schedule when switching to part time
      setFullTimeSchedule({
        morningShift: { startTime: '08:00', endTime: '12:00' },
        eveningShift: { startTime: '13:00', endTime: '17:00' },
        workingDays: [],
      });
    }
  };

  const handleShiftTypeChange = (shift: ShiftType) => {
    setEmploymentInfo(prev => ({ ...prev, shiftType: shift }));
    
    if (shift === 'Morning') {
      setShifts([{ name: 'Morning Shift', startTime: '08:00', endTime: '12:00' }]);
    } else if (shift === 'Evening') {
      setShifts([{ name: 'Evening Shift', startTime: '17:00', endTime: '21:00' }]);
    }
  };

  // Initialize form with teacher data when in edit mode
  React.useEffect(() => {
    if (isEdit && teacher) {
      console.log('🔍 Initializing TeacherRegistrationForm with teacher data:', teacher);
      console.log('🔍 Teacher permissions:', teacher.permissions);
      
      // Initialize personal info - ensure all fields are set
      setPersonalInfo({
        fullName: teacher.fullName || teacher.name || '',
        email: teacher.email || '',
        phoneNumber: teacher.phoneNumber || teacher.contact || '',
        emergencyContact: teacher.emergencyContact || '',
        department: teacher.department || '',
        location: (teacher.location || 'Local') as TeacherLocation,
      });
      
      // Initialize employment info
      if (teacher.employmentType) {
        const empType = teacher.employmentType as EmploymentType;
        setEmploymentInfo({
          employmentType: empType,
          shiftType: (teacher.shiftType || (empType === 'Full Time' ? 'Both' : 'Morning')) as ShiftType,
          scheduleDays: (teacher.schedule?.days || teacher.schedule?.workingDays || []) as ScheduleDay[],
        });
        
        // Set shifts
        if (teacher.shifts && teacher.shifts.length > 0) {
          setShifts(teacher.shifts);
        } else if (teacher.employmentType === 'Full Time') {
          setShifts([
            { name: 'Morning Shift', startTime: '08:00', endTime: '12:00' },
            { name: 'Afternoon Shift', startTime: '13:00', endTime: '17:00' },
          ]);
        } else {
          // Part Time: Initialize shifts from day schedules if available
          const dayScheds = (teacher.schedule as any)?.daySchedules;
          if (dayScheds && Array.isArray(dayScheds) && dayScheds.length > 0) {
            setShifts(dayScheds.map((ds: any) => ({
              name: `${ds.day} Shift`,
              startTime: ds.startTime,
              endTime: ds.endTime
            })));
          } else {
            setShifts([{ name: 'Morning Shift', startTime: '08:00', endTime: '12:00' }]);
          }
        }

        // Initialize schedule based on employment type
        if (teacher.schedule) {
          const scheduleDays = (teacher.schedule.days || teacher.schedule.workingDays || []) as ScheduleDay[];
          
          if (teacher.employmentType === 'Full Time') {
            // Full Time: Initialize from fullTimeSchedule if available, otherwise from shifts
            const fullTimeSched = (teacher.schedule as any)?.fullTimeSchedule;
            if (fullTimeSched && fullTimeSched.morningShift && fullTimeSched.eveningShift) {
              // Use stored fullTimeSchedule
              setFullTimeSchedule({
                morningShift: {
                  startTime: fullTimeSched.morningShift.startTime || '08:00',
                  endTime: fullTimeSched.morningShift.endTime || '12:00',
                },
                eveningShift: {
                  startTime: fullTimeSched.eveningShift.startTime || '13:00',
                  endTime: fullTimeSched.eveningShift.endTime || '17:00',
                },
                workingDays: fullTimeSched.workingDays && fullTimeSched.workingDays.length > 0 
                  ? fullTimeSched.workingDays 
                  : scheduleDays.length > 0 
                    ? scheduleDays 
                    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              });
            } else {
              // Fallback: Initialize from shifts and schedule
              const morningShift = teacher.shifts?.find((s: any) => s.name?.toLowerCase().includes('morning')) || 
                                  teacher.shifts?.find((s: any) => s.name?.toLowerCase().includes('morning shift')) ||
                                  teacher.shifts?.[0] || 
                                  { startTime: '08:00', endTime: '12:00' };
              const eveningShift = teacher.shifts?.find((s: any) => s.name?.toLowerCase().includes('evening')) || 
                                  teacher.shifts?.find((s: any) => s.name?.toLowerCase().includes('evening shift')) ||
                                  teacher.shifts?.find((s: any) => s.name?.toLowerCase().includes('afternoon')) ||
                                  teacher.shifts?.[1] || 
                                  { startTime: '13:00', endTime: '17:00' };
              
              setFullTimeSchedule({
                morningShift: {
                  startTime: morningShift.startTime || '08:00',
                  endTime: morningShift.endTime || '12:00',
                },
                eveningShift: {
                  startTime: eveningShift.startTime || '13:00',
                  endTime: eveningShift.endTime || '17:00',
                },
                workingDays: scheduleDays.length > 0 ? scheduleDays : 
                            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              });
            }
          } else {
            // Part Time: Initialize individual day schedules
            const dayScheds = (teacher.schedule as any)?.daySchedules;
            if (dayScheds && Array.isArray(dayScheds) && dayScheds.length > 0) {
              setPartTimeDaySchedules(dayScheds.map((ds: any) => ({
                day: ds.day,
                startTime: ds.startTime || '08:00',
                endTime: ds.endTime || '12:00',
              })));
            } else if (scheduleDays.length > 0) {
              const defaultStart = teacher.schedule.startTime || teacher.schedule.workingHours?.start || '08:00';
              const defaultEnd = teacher.schedule.endTime || teacher.schedule.workingHours?.end || '12:00';
              setPartTimeDaySchedules(scheduleDays.map(day => ({
                day,
                startTime: defaultStart,
                endTime: defaultEnd,
              })));
            }
          }
        }
      }
      
      // Initialize payroll info - ensure all fields are loaded
      if (teacher.payroll) {
        setPayrollInfo({
          hourlyRate: teacher.payroll.hourlyRate || teacher.payroll.hourlyRate === 0 ? 0 : 25,
          dailyHours: teacher.payroll.dailyHours || teacher.payroll.dailyHours === 0 ? 0 : (teacher.employmentType === 'Full Time' ? 8 : 4),
          daysWorking: teacher.payroll.daysWorking || teacher.payroll.daysWorking === 0 ? 0 : 22,
        });
      } else {
        // Set defaults based on employment type if no payroll data exists
        setPayrollInfo({
          hourlyRate: 25,
          dailyHours: teacher.employmentType === 'Full Time' ? 8 : 4,
          daysWorking: 22,
        });
      }
      
      // Initialize permissions - ensure all permission fields are present
      if (teacher.permissions) {
        const initializedPermissions: TeacherPermissions = {
          // Assessments & Evaluations
          canViewAssessments: teacher.permissions.canViewAssessments ?? true,
          canEditAssessments: teacher.permissions.canEditAssessments ?? true,
          canViewEvaluations: teacher.permissions.canViewEvaluations ?? true,
          canEditEvaluations: teacher.permissions.canEditEvaluations ?? true,
          
          // Financial & Billing
          canViewFinancials: teacher.permissions.canViewFinancials ?? false,
          
          // Scheduling & Logistics
          canManageSchedule: teacher.permissions.canManageSchedule ?? true,
          
          // Communication
          canContactParents: teacher.permissions.canContactParents ?? true,
          
          // Student Information
          canViewStudentEmail: teacher.permissions.canViewStudentEmail ?? true,
          canViewStudentContact: teacher.permissions.canViewStudentContact ?? true,
          canViewStudentPersonalInfo: teacher.permissions.canViewStudentPersonalInfo ?? true,
          
          // Module Permissions - Messages
          canAccessMessages: teacher.permissions.canAccessMessages ?? true,
          canSendMessages: teacher.permissions.canSendMessages ?? true,
          canViewAllMessages: teacher.permissions.canViewAllMessages ?? false,
          
          // Module Permissions - PDF
          canAccessPdf: teacher.permissions.canAccessPdf ?? true,
          canUploadPdf: teacher.permissions.canUploadPdf ?? false,
          canAnnotatePdf: teacher.permissions.canAnnotatePdf ?? true,
          canViewPdfAnnotations: teacher.permissions.canViewPdfAnnotations ?? true,
          
          // Module Permissions - Homework
          canAccessHomework: teacher.permissions.canAccessHomework ?? true,
          canCreateHomework: teacher.permissions.canCreateHomework ?? true,
          canGradeHomework: teacher.permissions.canGradeHomework ?? true,
          canViewHomeworkSubmissions: teacher.permissions.canViewHomeworkSubmissions ?? true,
          
          // Module Permissions - Evaluation
          canAccessEvaluations: teacher.permissions.canAccessEvaluations ?? true,
          canCreateEvaluations: teacher.permissions.canCreateEvaluations ?? false,
          canReviewEvaluations: teacher.permissions.canReviewEvaluations ?? false,
          canApproveEvaluations: teacher.permissions.canApproveEvaluations ?? false,
          
          // Module Permissions - Tickets
          canAccessTickets: teacher.permissions.canAccessTickets ?? true,
          canCreateTickets: teacher.permissions.canCreateTickets ?? false,
          canReviewTickets: teacher.permissions.canReviewTickets ?? true,
          canApproveTickets: teacher.permissions.canApproveTickets ?? false,
          canFinalizeTickets: teacher.permissions.canFinalizeTickets ?? false,
          
          // Module Permissions - Attendance
          canAccessAttendance: teacher.permissions.canAccessAttendance ?? true,
          canRecordAttendance: teacher.permissions.canRecordAttendance ?? true,
          canViewAttendanceReports: teacher.permissions.canViewAttendanceReports ?? true,
          
          // Module Permissions - Recordings
          canAccessRecordings: teacher.permissions.canAccessRecordings ?? true,
          canUploadRecordings: teacher.permissions.canUploadRecordings ?? true,
          canDeleteRecordings: teacher.permissions.canDeleteRecordings ?? false,
          canViewAllRecordings: teacher.permissions.canViewAllRecordings ?? false,
          
          // Module Permissions - Mushaf
          canAccessMushaf: teacher.permissions.canAccessMushaf ?? true,
          canMarkMistakes: teacher.permissions.canMarkMistakes ?? true,
          canViewMistakeHistory: teacher.permissions.canViewMistakeHistory ?? true,
          canManageMistakeLibrary: teacher.permissions.canManageMistakeLibrary ?? false,
          
          // Module Permissions - Qaidah
          canAccessQaidah: teacher.permissions.canAccessQaidah ?? true,
          canManageQaidah: teacher.permissions.canManageQaidah ?? false,
          canViewQaidahProgress: teacher.permissions.canViewQaidahProgress ?? true,
          
          // Module Permissions - Assignments
          canAccessAssignments: teacher.permissions.canAccessAssignments ?? true,
          canCreateAssignments: teacher.permissions.canCreateAssignments ?? true,
          canEditAssignments: teacher.permissions.canEditAssignments ?? false,
          canDeleteAssignments: teacher.permissions.canDeleteAssignments ?? false,
          
          // Teacher-Student Assignment
          canManageStudentAssignments: teacher.permissions.canManageStudentAssignments ?? false,
          
          // Module Permissions - Reports & Analytics
          canViewReports: teacher.permissions.canViewReports ?? true,
          canViewAnalytics: teacher.permissions.canViewAnalytics ?? true,
          canExportReports: teacher.permissions.canExportReports ?? false,
        };
        console.log('✅ Setting permissions:', initializedPermissions);
        setPermissions(initializedPermissions);
      } else {
        console.log('⚠️ No permissions found in teacher data, using defaults');
      }
      
      // Initialize ID document
      if (teacher.idDocument) {
        setIdDocument(teacher.idDocument);
      }
    } else if (!isEdit) {
      // Reset form when switching from edit to add mode
      setPersonalInfo({
        fullName: '',
        email: '',
        phoneNumber: '',
        emergencyContact: '',
        department: '',
        location: 'Local',
      });
      setEmploymentInfo({
        employmentType: 'Full Time',
        shiftType: 'Morning',
        scheduleDays: [],
      });
      setPayrollInfo({
        hourlyRate: 25,
        dailyHours: 8,
        daysWorking: 22,
      });
      setPermissions({
        // Assessments & Evaluations
        canViewAssessments: true,
        canEditAssessments: true,
        canViewEvaluations: true,
        canEditEvaluations: true,
        // Financial & Billing
        canViewFinancials: false,
        // Scheduling & Logistics
        canManageSchedule: true,
        // Communication
        canContactParents: true,
        // Student Information
        canViewStudentEmail: true,
        canViewStudentContact: true,
        canViewStudentPersonalInfo: true,
        // Messages Module
        canAccessMessages: true,
        canSendMessages: true,
        canViewAllMessages: false,
        // PDF Module
        canAccessPdf: true,
        canUploadPdf: true,
        canAnnotatePdf: true,
        canViewPdfAnnotations: true,
        // Homework Module
        canAccessHomework: true,
        canCreateHomework: true,
        canGradeHomework: true,
        canViewHomeworkSubmissions: true,
        // Evaluation Module
        canAccessEvaluations: true,
        canCreateEvaluations: true,
        canReviewEvaluations: true,
        canApproveEvaluations: false,
        // Tickets Module
        canAccessTickets: true,
        canCreateTickets: true,
        canReviewTickets: true,
        canApproveTickets: false,
        canFinalizeTickets: false,
        // Attendance Module
        canAccessAttendance: true,
        canRecordAttendance: true,
        canViewAttendanceReports: true,
        // Recordings Module
        canAccessRecordings: true,
        canUploadRecordings: true,
        canDeleteRecordings: false,
        canViewAllRecordings: false,
        // Mushaf Module
        canAccessMushaf: true,
        canMarkMistakes: true,
        canViewMistakeHistory: true,
        canManageMistakeLibrary: false,
        // Qaidah Module
        canAccessQaidah: true,
        canManageQaidah: true,
        canViewQaidahProgress: true,
        // Assignments Module
        canAccessAssignments: true,
        canCreateAssignments: true,
        canEditAssignments: true,
        canDeleteAssignments: false,
        // Teacher-Student Assignment
        canManageStudentAssignments: false,
        // Reports & Analytics
        canViewReports: true,
        canViewAnalytics: false,
        canExportReports: false,
      });
      setIdDocument('');
    }
  }, [isEdit, teacher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only allow submission on the last tab (Permissions tab)
    if (currentTab !== tabs.length - 1) {
      // If not on last tab, just navigate to next tab instead
      setCurrentTab(currentTab + 1);
      return;
    }
    
    setSubmitError(null);
    setIsSubmitting(true);
    
    try {
      // Validation
      if (!personalInfo.fullName?.trim()) {
        throw new Error('Full Name is required');
      }
      if (!personalInfo.email?.trim()) {
        throw new Error('Email Address is required');
      }
      if (!personalInfo.phoneNumber?.trim()) {
        throw new Error('Phone Number is required');
      }
      if (!personalInfo.emergencyContact?.trim()) {
        throw new Error('Emergency Contact is required');
      }
      if (!personalInfo.department?.trim()) {
        throw new Error('Department is required');
      }
      
      if (employmentInfo.employmentType === 'Full Time') {
        if (fullTimeSchedule.workingDays.length === 0) {
          throw new Error('Please select working days for Full Time schedule');
        }
      } else {
        if (partTimeDaySchedules.length === 0) {
          throw new Error('Please add at least one day schedule for Part Time');
        }
      }
      
      // Validate payroll info
      if (!payrollInfo.hourlyRate || payrollInfo.hourlyRate <= 0) {
        throw new Error('Hourly Rate must be greater than 0');
      }
      if (!payrollInfo.dailyHours || payrollInfo.dailyHours <= 0) {
        throw new Error('Daily Hours must be greater than 0');
      }
      if (!payrollInfo.daysWorking || payrollInfo.daysWorking <= 0) {
        throw new Error('Days Working must be greater than 0');
      }
      
      const newTeacher: Teacher = {
        id: isEdit && teacher?.id ? teacher.id : `TCH${Date.now()}`,
        fullName: personalInfo.fullName,
        email: personalInfo.email,
        phoneNumber: personalInfo.phoneNumber,
        emergencyContact: personalInfo.emergencyContact,
        department: personalInfo.department,
        location: personalInfo.location,
        employmentType: employmentInfo.employmentType,
        shiftType: employmentInfo.shiftType,
        shifts: employmentInfo.employmentType === 'Full Time' ? [
          { name: 'Morning Shift', startTime: fullTimeSchedule.morningShift.startTime, endTime: fullTimeSchedule.morningShift.endTime },
          { name: 'Evening Shift', startTime: fullTimeSchedule.eveningShift.startTime, endTime: fullTimeSchedule.eveningShift.endTime },
        ] : (partTimeDaySchedules.length > 0 
          ? partTimeDaySchedules.map(ds => ({
              name: `${ds.day} Shift`,
              startTime: ds.startTime,
              endTime: ds.endTime
            }))
          : shifts),
        idDocument: idDocument,
        assignedStudents: isEdit ? teacher?.assignedStudents || [] : [],
        permissions: {
          ...permissions,
        },
        schedule: employmentInfo.employmentType === 'Full Time' ? {
          days: fullTimeSchedule.workingDays,
          startTime: fullTimeSchedule.morningShift.startTime,
          endTime: fullTimeSchedule.eveningShift.endTime,
          workingDays: fullTimeSchedule.workingDays,
          workingHours: {
            start: fullTimeSchedule.morningShift.startTime,
            end: fullTimeSchedule.eveningShift.endTime,
          },
          // Store Full Time schedule format
          fullTimeSchedule: {
            morningShift: fullTimeSchedule.morningShift,
            eveningShift: fullTimeSchedule.eveningShift,
            workingDays: fullTimeSchedule.workingDays,
          },
        } : {
          days: partTimeDaySchedules.map(ds => ds.day),
          startTime: partTimeDaySchedules[0]?.startTime || '08:00',
          endTime: partTimeDaySchedules[0]?.endTime || '12:00',
          workingDays: partTimeDaySchedules.map(ds => ds.day),
          workingHours: {
            start: partTimeDaySchedules[0]?.startTime || '08:00',
            end: partTimeDaySchedules[0]?.endTime || '12:00',
          },
          // Store individual day schedules for Part Time
          daySchedules: partTimeDaySchedules.map(ds => ({
            day: ds.day,
            startTime: ds.startTime,
            endTime: ds.endTime,
          })),
        } as any,
        payroll: {
          hourlyRate: payrollInfo.hourlyRate,
          currency: currency,
          dailyHours: payrollInfo.dailyHours,
          daysWorking: payrollInfo.daysWorking,
          monthlyHours: monthlyHours,
          monthlySalary: monthlySalary,
          paymentType: 'monthly',
        },
        hireDate: isEdit && teacher?.hireDate ? teacher.hireDate : new Date().toISOString().split('T')[0],
        status: isEdit ? teacher?.status || 'active' : 'active',
        avatar: teacher?.avatar || `https://ui-avatars.com/api/?name=${personalInfo.fullName.replace(' ', '+')}&background=10b981&color=fff`,
      };

      if (isEdit && teacher) {
        // Use teacher._id if available (MongoDB ID), otherwise use teacher.id
        const teacherId = (teacher as any)._id || teacher.id;
        console.log('💾 Updating teacher with ID:', teacherId);
        console.log('💾 Teacher data being sent:', {
          id: teacherId,
          fullName: newTeacher.fullName,
          email: newTeacher.email,
          employmentType: newTeacher.employmentType,
          payroll: newTeacher.payroll,
          schedule: {
            ...newTeacher.schedule,
            fullTimeSchedule: (newTeacher.schedule as any).fullTimeSchedule,
            daySchedules: (newTeacher.schedule as any).daySchedules,
          },
          permissions: newTeacher.permissions
        });
        
        if (!teacherId) {
          throw new Error('Teacher ID is required for update');
        }
        
        await updateTeacher(teacherId, newTeacher);
        console.log('✅ Teacher updated, refreshing data...');
        
        // Refresh data to ensure UI updates
        if (refreshData) {
          await refreshData();
        }
        
        alert('Teacher updated successfully!');
        onClose();
      } else {
        console.log('💾 Creating new teacher:', {
          fullName: newTeacher.fullName,
          email: newTeacher.email,
          employmentType: newTeacher.employmentType,
          payroll: newTeacher.payroll,
          schedule: {
            ...newTeacher.schedule,
            fullTimeSchedule: (newTeacher.schedule as any).fullTimeSchedule,
            daySchedules: (newTeacher.schedule as any).daySchedules,
          },
        });
        await addTeacher(newTeacher);
        
        // Refresh data to ensure UI updates
        if (refreshData) {
          await refreshData();
        }
        
        alert('Teacher registered successfully!');
        onClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save teacher. Please try again.';
      setSubmitError(errorMessage);
      console.error('Error saving teacher:', error);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { name: 'Personal Info', icon: '' },
    { name: 'Employment & Schedule', icon: '' },
    { name: 'Payroll', icon: '' },
    { name: 'Permissions', icon: '' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col my-8 border border-gray-200">
        {/* Modern Header */}
        <div className="bg-gradient-to-br from-primary to-[rgba(var(--color-primary-rgb),0.9)] text-white p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("${headerPattern}")`
          }}></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-1">{isEdit ? 'Edit Teacher Profile' : 'Register New Teacher'}</h2>
                <p className="text-white/90 text-sm">Complete teacher profile with payroll and scheduling</p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
                type="button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setCurrentTab(index)}
              type="button"
              className={`flex-1 py-4 px-4 font-semibold transition-all relative ${
                currentTab === index
                  ? 'text-primary bg-soft-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm hidden sm:inline">{tab.name}</span>
              </div>
              {currentTab === index && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
              )}
            </button>
          ))}
        </div>

        <form 
          onSubmit={handleSubmit} 
          onKeyDown={(e) => {
            // Prevent Enter key from submitting form unless on last tab
            if (e.key === 'Enter' && currentTab !== tabs.length - 1) {
              e.preventDefault();
              // Navigate to next tab instead
              if (currentTab < tabs.length - 1) {
                setCurrentTab(currentTab + 1);
              }
            }
          }}
          className="flex-1 overflow-y-auto bg-gray-50"
        >
          {submitError && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800 font-medium">{submitError}</p>
              </div>
            </div>
          )}
          <div className="p-6 md:p-8">
            {/* Tab 1: Personal Information */}
            {currentTab === 0 && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h3>
                  <p className="text-sm text-gray-600">Enter the teacher's basic contact and identification details</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={personalInfo.fullName}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                        placeholder="e.g., Dr. Ahmed Ali"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={personalInfo.email}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                        placeholder="teacher@umaracademy.org"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={personalInfo.phoneNumber}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, phoneNumber: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                        placeholder="+1-555-0000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Emergency Contact <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={personalInfo.emergencyContact}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, emergencyContact: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                        placeholder="+1-555-0000"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={personalInfo.department}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, department: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                        placeholder="e.g., Islamic Studies, Mathematics, Science"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Selection */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    Teacher Location <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPersonalInfo({ ...personalInfo, location: 'Local' })}
                      className={`py-6 px-6 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                        personalInfo.location === 'Local'
                          ? 'bg-primary text-white shadow-xl ring-4 ring-primary/30'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      <div className="text-4xl mb-2">🇺🇸</div>
                      <div className="text-lg">Local (USA)</div>
                      <div className="text-xs mt-2 opacity-80">Salary in USD ($)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonalInfo({ ...personalInfo, location: 'Overseas Pakistan' })}
                      className={`py-6 px-6 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                        personalInfo.location === 'Overseas Pakistan'
                          ? 'bg-primary text-white shadow-xl ring-4 ring-primary/30'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      <div className="text-lg font-semibold mb-2">PK</div>
                      <div className="text-lg">Overseas Pakistan</div>
                      <div className="text-xs mt-2 opacity-80">Salary in PKR (Rs)</div>
                    </button>
                  </div>
                  <div className="mt-4 p-4 bg-soft-primary border-l-4 border-primary rounded-lg">
                    <p className="text-sm text-primary font-medium">
                      <strong>Selected:</strong> {personalInfo.location} • Currency: <strong>{currency}</strong> ({currencySymbol})
                    </p>
                  </div>
                </div>

                {/* ID Document Upload */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Upload ID Document <span className="text-gray-500 font-normal">(PNG/PDF - Optional)</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="id-document-upload"
                    />
                    <label
                      htmlFor="id-document-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        {idDocument ? 'Document uploaded ✓' : 'Click to upload or drag and drop'}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</span>
                    </label>
                  </div>
                  {idDocument && (
                    <div className="mt-3 p-3 bg-soft-primary border border-primary/30 rounded-lg flex items-center">
                      <svg className="w-5 h-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-primary font-medium">Document uploaded successfully</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Employment & Scheduling */}
            {currentTab === 1 && (
              <div className="space-y-6 overflow-y-auto max-h-[calc(95vh-300px)] pr-2">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Employment & Scheduling</h3>
                  <p className="text-sm text-gray-600">Configure employment type and working schedule</p>
                </div>
                
                {/* Employment Type */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    Employment Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleEmploymentTypeChange('Full Time')}
                      className={`py-5 px-6 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                        employmentInfo.employmentType === 'Full Time'
                          ? 'bg-primary text-white shadow-xl ring-4 ring-primary/30'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      <div className="text-lg">Full Time</div>
                      <div className="text-xs mt-1 opacity-80">8 hours/day, Mon-Sat</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEmploymentTypeChange('Part Time')}
                      className={`py-5 px-6 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                        employmentInfo.employmentType === 'Part Time'
                          ? 'bg-primary text-white shadow-xl ring-4 ring-primary/30'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      <div className="text-lg">Part Time</div>
                      <div className="text-xs mt-1 opacity-80">Flexible schedule</div>
                    </button>
                  </div>
                </div>

                {/* Schedule Configuration */}
                {employmentInfo.employmentType === 'Full Time' ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-4">
                      Full Time Schedule (Mon-Sat, 2 Shifts) <span className="text-red-500">*</span>
                    </label>
                    
                    {/* Morning Shift */}
                    <div className="bg-gradient-to-r from-soft-primary to-soft-primary p-5 rounded-xl border-2 border-primary/30 mb-4">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>Morning Shift</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time <span className="text-red-500">*</span></label>
                          <input
                            type="time"
                            required
                            value={fullTimeSchedule.morningShift.startTime}
                            onChange={(e) => setFullTimeSchedule(prev => ({
                              ...prev,
                              morningShift: { ...prev.morningShift, startTime: e.target.value }
                            }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">End Time <span className="text-red-500">*</span></label>
                          <input
                            type="time"
                            required
                            value={fullTimeSchedule.morningShift.endTime}
                            onChange={(e) => setFullTimeSchedule(prev => ({
                              ...prev,
                              morningShift: { ...prev.morningShift, endTime: e.target.value }
                            }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Evening Shift */}
                    <div className="bg-gradient-to-r from-accent/10 to-accent/20 p-5 rounded-xl border-2 border-accent/30 mb-4">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>Evening Shift</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time <span className="text-red-500">*</span></label>
                          <input
                            type="time"
                            required
                            value={fullTimeSchedule.eveningShift.startTime}
                            onChange={(e) => setFullTimeSchedule(prev => ({
                              ...prev,
                              eveningShift: { ...prev.eveningShift, startTime: e.target.value }
                            }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">End Time <span className="text-red-500">*</span></label>
                          <input
                            type="time"
                            required
                            value={fullTimeSchedule.eveningShift.endTime}
                            onChange={(e) => setFullTimeSchedule(prev => ({
                              ...prev,
                              eveningShift: { ...prev.eveningShift, endTime: e.target.value }
                            }))}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Working Days (Mon-Sat) */}
                    <div className="bg-gray-50 p-5 rounded-xl border-2 border-gray-200">
                      <h4 className="font-bold text-gray-900 mb-4">Working Days (Monday - Saturday)</h4>
                      <div className="flex flex-wrap gap-3">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const isSelected = fullTimeSchedule.workingDays.includes(day as ScheduleDay);
                              setFullTimeSchedule(prev => ({
                                ...prev,
                                workingDays: isSelected
                                  ? prev.workingDays.filter(d => d !== day)
                                  : [...prev.workingDays, day as ScheduleDay]
                              }));
                            }}
                            className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 ${
                              fullTimeSchedule.workingDays.includes(day as ScheduleDay)
                                ? 'bg-primary text-white shadow-lg ring-2 ring-primary/30'
                                : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            {day.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mt-3">Select the days this teacher will work (default: Mon-Sat)</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-4">
                      Part Time Schedule <span className="text-red-500">*</span>
                    </label>
                    
                    {/* List of added days */}
                    {partTimeDaySchedules.length > 0 && (
                      <div className="mb-6 space-y-3">
                        {partTimeDaySchedules.map((daySchedule, index) => (
                          <div key={index} className="bg-gradient-to-r from-soft-primary to-soft-primary p-4 rounded-xl border-2 border-primary/30 flex items-center justify-between">
                            <div className="flex-1">
                              <span className="font-bold text-gray-900 text-lg">{daySchedule.day}</span>
                              <span className="ml-4 text-sm font-semibold text-gray-700">
                                {daySchedule.startTime} - {daySchedule.endTime}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setPartTimeDaySchedules(partTimeDaySchedules.filter((_, i) => i !== index));
                              }}
                              className="ml-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold transition"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Form to add a new day */}
                    <div className="bg-gray-50 p-5 rounded-xl border-2 border-gray-200">
                      <h4 className="font-bold text-gray-900 mb-4">Add Day Schedule</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Day <span className="text-red-500">*</span></label>
                          <select
                            value={newPartTimeDay.day}
                            onChange={(e) => setNewPartTimeDay({ ...newPartTimeDay, day: e.target.value as ScheduleDay })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                          >
                            {allDays.filter(day => !partTimeDaySchedules.find(ds => ds.day === day)).map(day => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time <span className="text-red-500">*</span></label>
                          <input
                            type="time"
                            value={newPartTimeDay.startTime}
                            onChange={(e) => setNewPartTimeDay({ ...newPartTimeDay, startTime: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">End Time <span className="text-red-500">*</span></label>
                          <input
                            type="time"
                            value={newPartTimeDay.endTime}
                            onChange={(e) => setNewPartTimeDay({ ...newPartTimeDay, endTime: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (!partTimeDaySchedules.find(ds => ds.day === newPartTimeDay.day)) {
                                setPartTimeDaySchedules([...partTimeDaySchedules, { ...newPartTimeDay }]);
                                setNewPartTimeDay({
                                  day: allDays.find(day => !partTimeDaySchedules.find(ds => ds.day === day)) || 'Monday' as ScheduleDay,
                                  startTime: '08:00',
                                  endTime: '12:00',
                                });
                              }
                            }}
                            disabled={!!partTimeDaySchedules.find(ds => ds.day === newPartTimeDay.day) || partTimeDaySchedules.length >= 7}
                            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-[rgba(var(--color-primary-rgb),0.9)] disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition transform hover:scale-105 disabled:hover:scale-100"
                          >
                            Add Day
                          </button>
                        </div>
                      </div>
                      {partTimeDaySchedules.find(ds => ds.day === newPartTimeDay.day) && (
                        <p className="text-xs text-red-600 mt-3 font-medium">This day is already added</p>
                      )}
                      {partTimeDaySchedules.length === 0 && (
                        <p className="text-xs text-gray-600 mt-3">Add at least one day schedule for Part Time employment</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Payroll Information */}
            {currentTab === 2 && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Payroll Information</h3>
                  <p className="text-sm text-gray-600">Set compensation details - monthly salary is auto-calculated</p>
                </div>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-yellow-800 font-medium">
                      <strong>Note:</strong> Monthly hours and salary are auto-calculated. Currency is <strong>{currency}</strong> ({currencySymbol}) based on teacher location: <strong>{personalInfo.location}</strong>
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Hourly Rate ({currencySymbol}) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold text-lg">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={payrollInfo.hourlyRate}
                          onChange={(e) => setPayrollInfo({ ...payrollInfo, hourlyRate: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                          placeholder={currency === 'USD' ? '25.00' : '5000'}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Daily Hours <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="24"
                        value={payrollInfo.dailyHours}
                        onChange={(e) => setPayrollInfo({ ...payrollInfo, dailyHours: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                        placeholder="8"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Days Working (Monthly) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="31"
                        value={payrollInfo.daysWorking}
                        onChange={(e) => setPayrollInfo({ ...payrollInfo, daysWorking: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                        placeholder="22"
                      />
                    </div>
                  </div>
                </div>

                {/* Auto-calculated fields */}
                <div className="bg-gradient-to-br from-soft-primary via-soft-primary to-soft-primary p-8 rounded-xl border-2 border-primary/30 shadow-lg">
                  <h4 className="font-bold text-gray-900 mb-6 text-xl flex items-center gap-2">
                    <span>Calculated Compensation ({currency})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-md border-2 border-primary/30">
                      <p className="text-sm text-gray-600 mb-2 font-medium">Monthly Hours</p>
                      <p className="text-4xl font-bold text-primary mb-2">{monthlyHours}</p>
                      <p className="text-xs text-gray-500">
                        {payrollInfo.dailyHours} hrs × {payrollInfo.daysWorking} days
                      </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-md border-2 border-primary/30">
                      <p className="text-sm text-gray-600 mb-2 font-medium">Monthly Salary ({currency})</p>
                      <p className="text-4xl font-bold text-primary mb-2">{currencySymbol}{monthlySalary.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">
                        {currencySymbol}{payrollInfo.hourlyRate}/hr × {monthlyHours} hrs
                      </p>
                    </div>
                  </div>
                  {currency === 'PKR' && (
                    <div className="mt-4 p-4 bg-accent/20 rounded-lg border border-accent/30">
                      <p className="text-sm text-primary font-semibold">
                        Pakistani Rupee (PKR) salary for overseas teachers
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Permissions */}
            {currentTab === 3 && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Permissions</h3>
                  <p className="text-sm text-gray-600">Configure what this teacher can access and manage</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(permissions).map(([key, value]) => {
                      const permissionKey = key as keyof TeacherPermissions;
                      const permissionLabels: Record<string, string> = {
                        canViewAssessments: 'View Assessments',
                        canEditAssessments: 'Edit Assessments',
                        canViewEvaluations: 'View Evaluations',
                        canEditEvaluations: 'Edit Evaluations',
                        canViewFinancials: 'View Financials',
                        canManageSchedule: 'Manage Schedule',
                        canContactParents: 'Contact Parents',
                        canViewStudentEmail: 'View Student Email',
                        canViewStudentContact: 'View Student Contact',
                        canViewStudentPersonalInfo: 'View Student Personal Info',
                      };
                      const permissionDescriptions: Record<string, string> = {
                        canViewAssessments: 'View student assessments and test scores',
                        canEditAssessments: 'Add and modify student assessments',
                        canViewEvaluations: 'View student behavior evaluations',
                        canEditEvaluations: 'Create and edit student evaluations',
                        canViewFinancials: 'Access student financial information',
                        canManageSchedule: 'Modify student schedules',
                        canContactParents: 'Send messages to parents',
                        canViewStudentEmail: 'View student email addresses',
                        canViewStudentContact: 'View student contact information',
                        canViewStudentPersonalInfo: 'View student personal information',
                      };
                      return (
                        <label 
                          key={key} 
                          className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            value === true
                              ? 'bg-soft-primary border-primary/30 hover:bg-soft-primary'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-gray-900 mb-1">
                              {permissionLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}
                            </p>
                            <p className="text-xs text-gray-600">
                              {permissionDescriptions[key] || 'Permission description'}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={value === true}
                              onChange={(e) => {
                                const newPermissions = { ...permissions, [permissionKey]: e.target.checked };
                                console.log(`🔐 Updating permission ${key}:`, e.target.checked);
                                setPermissions(newPermissions);
                              }}
                              className="w-6 h-6 text-primary focus:ring-primary rounded cursor-pointer border-2 border-gray-300"
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation and Submit */}
          <div className="border-t-2 border-gray-200 bg-white p-6 shadow-lg">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 transition"
              >
                Cancel
              </button>
              
              <div className="flex space-x-3">
                {currentTab > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isSubmitting) {
                        setCurrentTab(currentTab - 1);
                      }
                    }}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105 disabled:hover:scale-100"
                  >
                    ← Previous
                  </button>
                )}
                
                {currentTab < tabs.length - 1 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isSubmitting) {
                        setCurrentTab(currentTab + 1);
                      }
                    }}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-[rgba(var(--color-primary-rgb),0.9)] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-primary text-white rounded-xl hover:bg-[rgba(var(--color-primary-rgb),0.9)] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {isEdit ? 'Update Teacher' : 'Register Teacher'}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-700 mb-2 font-semibold">
                <span>Step {currentTab + 1} of {tabs.length}</span>
                <span>{Math.round(((currentTab + 1) / tabs.length) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.9)] h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${((currentTab + 1) / tabs.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherRegistrationForm;
