import React, { useState } from 'react';
import { Teacher, ScheduleDay, TeacherPermissions, EmploymentType, ShiftType, Shift, TeacherLocation, Currency } from '../types';
import { useData } from '../contexts/DataContext';

interface TeacherRegistrationFormProps {
  onClose: () => void;
  teacher?: any;
  isEdit?: boolean;
}

const TeacherRegistrationForm: React.FC<TeacherRegistrationFormProps> = ({ onClose, teacher, isEdit = false }) => {
  const { addTeacher, updateTeacher } = useData();
  const [currentTab, setCurrentTab] = useState(0);
  
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
    canViewAssessments: true,
    canEditAssessments: true,
    canViewEvaluations: true,
    canEditEvaluations: true,
    canViewFinancials: false,
    canManageSchedule: true,
    canContactParents: true,
  });

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
      // Full time gets both shifts
      setEmploymentInfo(prev => ({ ...prev, shiftType: 'Both' }));
      setShifts([
        { name: 'Morning Shift', startTime: '08:00', endTime: '12:00' },
        { name: 'Afternoon Shift', startTime: '13:00', endTime: '17:00' },
      ]);
      setPayrollInfo(prev => ({ ...prev, dailyHours: 8, daysWorking: 22 }));
    } else {
      // Part time gets one shift
      setShifts([{ name: 'Morning Shift', startTime: '08:00', endTime: '12:00' }]);
      setPayrollInfo(prev => ({ ...prev, dailyHours: 4, daysWorking: 22 }));
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
      setPersonalInfo({
        fullName: teacher.fullName || '',
        email: teacher.email || '',
        phoneNumber: teacher.phoneNumber || '',
        emergencyContact: teacher.emergencyContact || '',
        department: teacher.department || '',
        location: teacher.location || 'Local',
      });
      // Add more initialization for other fields if needed
    }
  }, [isEdit, teacher]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
      shifts: shifts,
      idDocument: idDocument,
      assignedStudents: [],
      permissions: permissions,
      schedule: {
        days: employmentInfo.scheduleDays,
        startTime: shifts[0]?.startTime || '08:00',
        endTime: shifts[shifts.length - 1]?.endTime || '17:00',
      },
      payroll: {
        hourlyRate: payrollInfo.hourlyRate,
        currency: currency,
        dailyHours: payrollInfo.dailyHours,
        daysWorking: payrollInfo.daysWorking,
        monthlyHours: monthlyHours,
        monthlySalary: monthlySalary,
      },
      hireDate: new Date().toISOString().split('T')[0],
      status: 'active',
      avatar: teacher?.avatar || `https://ui-avatars.com/api/?name=${personalInfo.fullName.replace(' ', '+')}&background=10b981&color=fff`,
    };

    if (isEdit && teacher?.id) {
      updateTeacher(teacher.id, newTeacher);
      alert('Teacher updated successfully!');
    } else {
      addTeacher(newTeacher);
      alert('Teacher registered successfully!');
    }
    onClose();
  };

  const tabs = [
    { name: 'Personal Info', icon: '👤' },
    { name: 'Employment & Schedule', icon: '📅' },
    { name: 'Payroll', icon: '💰' },
    { name: 'Permissions', icon: '🔐' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6">
          <h2 className="text-2xl font-bold">{isEdit ? '✏️ Edit Teacher' : '👨‍🏫 Register New Teacher'}</h2>
          <p className="text-green-100 text-sm mt-1">Complete teacher profile with payroll and scheduling</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setCurrentTab(index)}
              className={`flex-1 py-4 px-4 font-medium transition ${
                currentTab === index
                  ? 'bg-white text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl mr-2">{tab.icon}</span>
              <span className="text-sm hidden md:inline">{tab.name}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Tab 1: Personal Information */}
            {currentTab === 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={personalInfo.fullName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Dr. Ahmed Ali"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="teacher@umaracademy.org"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={personalInfo.phoneNumber}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="+1-555-0000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact *</label>
                    <input
                      type="tel"
                      required
                      value={personalInfo.emergencyContact}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, emergencyContact: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="+1-555-0000"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                    <input
                      type="text"
                      required
                      value={personalInfo.department}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Islamic Studies, Mathematics, Science"
                    />
                  </div>
                </div>

                {/* Location Selection */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teacher Location *</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPersonalInfo({ ...personalInfo, location: 'Local' })}
                      className={`py-4 px-4 rounded-lg font-medium transition ${
                        personalInfo.location === 'Local'
                          ? 'bg-primary-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">🇺🇸</div>
                      <div>Local (USA)</div>
                      <div className="text-xs mt-1 opacity-75">Salary in USD ($)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonalInfo({ ...personalInfo, location: 'Overseas Pakistan' })}
                      className={`py-4 px-4 rounded-lg font-medium transition ${
                        personalInfo.location === 'Overseas Pakistan'
                          ? 'bg-primary-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">🇵🇰</div>
                      <div>Overseas Pakistan</div>
                      <div className="text-xs mt-1 opacity-75">Salary in PKR (Rs)</div>
                    </button>
                  </div>
                  <div className="mt-3 p-3 bg-cream-100 border border-gold-300 rounded-lg">
                    <p className="text-sm text-primary-800">
                      💡 <strong>Selected:</strong> {personalInfo.location} • Currency: <strong>{currency}</strong> ({currencySymbol})
                    </p>
                  </div>
                </div>

                {/* ID Document Upload */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload ID Document (PNG/PDF)</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    onChange={handleFileUpload}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  {idDocument && (
                    <p className="text-sm text-green-600 mt-2">✓ Document uploaded successfully</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Employment & Scheduling */}
            {currentTab === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment & Scheduling</h3>
                
                {/* Employment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type *</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleEmploymentTypeChange('Full Time')}
                      className={`py-4 px-4 rounded-lg font-medium transition ${
                        employmentInfo.employmentType === 'Full Time'
                          ? 'bg-green-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Full Time
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEmploymentTypeChange('Part Time')}
                      className={`py-4 px-4 rounded-lg font-medium transition ${
                        employmentInfo.employmentType === 'Part Time'
                          ? 'bg-green-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Part Time
                    </button>
                  </div>
                </div>

                {/* Shift Selection for Part Time */}
                {employmentInfo.employmentType === 'Part Time' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shift *</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => handleShiftTypeChange('Morning')}
                        className={`py-4 px-4 rounded-lg font-medium transition ${
                          employmentInfo.shiftType === 'Morning'
                            ? 'bg-primary-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        🌅 Morning
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShiftTypeChange('Evening')}
                        className={`py-4 px-4 rounded-lg font-medium transition ${
                          employmentInfo.shiftType === 'Evening'
                            ? 'bg-primary-700 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        🌙 Evening
                      </button>
                    </div>
                  </div>
                )}

                {/* Shift Display */}
                <div className="bg-cream-100 p-4 rounded-lg border border-gold-200">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    {employmentInfo.employmentType === 'Full Time' ? 'Assigned Shifts (Auto)' : 'Selected Shift'}
                  </h4>
                  <div className="space-y-2">
                    {shifts.map((shift, index) => (
                      <div key={index} className="bg-white p-3 rounded flex justify-between items-center">
                        <span className="font-medium">{shift.name}</span>
                        <span className="text-sm text-gray-600">{shift.startTime} - {shift.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Working Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Working Days *</label>
                  <div className="flex flex-wrap gap-2">
                    {allDays.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayToggle(day)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          employmentInfo.scheduleDays.includes(day)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Payroll Information */}
            {currentTab === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payroll Information</h3>
                
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Note:</strong> Monthly hours and salary are auto-calculated. Currency is <strong>{currency}</strong> ({currencySymbol}) based on teacher location: <strong>{personalInfo.location}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate ({currencySymbol}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={payrollInfo.hourlyRate}
                        onChange={(e) => setPayrollInfo({ ...payrollInfo, hourlyRate: parseFloat(e.target.value) })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder={currency === 'USD' ? '25.00' : '5000'}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daily Hours *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="24"
                      value={payrollInfo.dailyHours}
                      onChange={(e) => setPayrollInfo({ ...payrollInfo, dailyHours: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Days Working (Monthly) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={payrollInfo.daysWorking}
                      onChange={(e) => setPayrollInfo({ ...payrollInfo, daysWorking: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Auto-calculated fields */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-300 mt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">💰 Calculated Compensation ({currency})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Monthly Hours</p>
                      <p className="text-2xl font-bold text-green-600">{monthlyHours} hrs</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {payrollInfo.dailyHours} hrs × {payrollInfo.daysWorking} days
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Monthly Salary ({currency})</p>
                      <p className="text-2xl font-bold text-green-600">{currencySymbol}{monthlySalary.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {currencySymbol}{payrollInfo.hourlyRate}/hr × {monthlyHours} hrs
                      </p>
                    </div>
                  </div>
                  {currency === 'PKR' && (
                    <div className="mt-3 p-3 bg-green-200 rounded-lg">
                      <p className="text-xs text-green-900">
                        💵 Pakistani Rupee (PKR) salary for overseas teachers
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Permissions */}
            {currentTab === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Access Permissions</h3>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  {Object.entries(permissions).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </p>
                        <p className="text-xs text-gray-600">
                          {key === 'canViewAssessments' && 'View student assessments and test scores'}
                          {key === 'canEditAssessments' && 'Add and modify student assessments'}
                          {key === 'canViewEvaluations' && 'View student behavior evaluations'}
                          {key === 'canEditEvaluations' && 'Create and edit student evaluations'}
                          {key === 'canViewFinancials' && 'Access student financial information'}
                          {key === 'canManageSchedule' && 'Modify student schedules'}
                          {key === 'canContactParents' && 'Send messages to parents'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                        className="w-5 h-5 text-green-600 focus:ring-green-500 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation and Submit */}
          <div className="border-t bg-gray-50 p-6">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
              >
                Cancel
              </button>
              
              <div className="flex space-x-3">
                {currentTab > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentTab(currentTab - 1)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                  >
                    ← Previous
                  </button>
                )}
                
                {currentTab < tabs.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentTab(currentTab + 1)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    ✓ Register Teacher
                  </button>
                )}
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Step {currentTab + 1} of {tabs.length}</span>
                <span>{Math.round(((currentTab + 1) / tabs.length) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
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
