// This script populates localStorage with sample data for the frontend
// Run this in the browser console or create a simple HTML page to execute it

const sampleStudents = [
  {
    id: 'STU001',
    fullName: 'Ahmed Ali',
    email: 'ahmed@umaracademy.com',
    contact: '+1-555-0123',
    program: 'Quran Recitation',
    level: 'Beginner',
    assignedTeacher: 'Ustadh Muhammad',
    enrolledDate: '2024-01-15',
    tuitionFee: 150,
    paymentStatus: 'current',
    status: 'active',
    parentName: 'Ali Hassan',
    parentContact: '+1-555-0124',
    avatar: 'https://ui-avatars.com/api/?name=Ahmed+Ali&background=2E4D32&color=fff',
    address: {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    schedule: {
      days: ['Monday', 'Wednesday', 'Friday'],
      startTime: '10:00 AM',
      endTime: '11:00 AM'
    },
    siblings: [],
    assignments: [
      {
        id: 'ASS001',
        title: 'Surah Al-Fatiha Memorization',
        course: 'Quran Recitation',
        dueDate: '2024-02-15',
        status: 'pending',
        grade: null,
        maxPoints: 100,
        type: 'homework'
      }
    ],
    assessments: [],
    evaluations: []
  },
  {
    id: 'STU002',
    fullName: 'Fatima Hassan',
    email: 'fatima@umaracademy.com',
    contact: '+1-555-0125',
    program: 'Arabic Language',
    level: 'Intermediate',
    assignedTeacher: 'Ustadh Ali',
    enrolledDate: '2024-01-20',
    tuitionFee: 150,
    paymentStatus: 'current',
    status: 'active',
    parentName: 'Hassan Ahmed',
    parentContact: '+1-555-0126',
    avatar: 'https://ui-avatars.com/api/?name=Fatima+Hassan&background=2E4D32&color=fff',
    address: {
      street: '456 Oak Avenue',
      city: 'New York',
      state: 'NY',
      zipCode: '10002',
      country: 'USA'
    },
    schedule: {
      days: ['Tuesday', 'Thursday'],
      startTime: '2:00 PM',
      endTime: '3:00 PM'
    },
    siblings: [],
    assignments: [
      {
        id: 'ASS002',
        title: 'Arabic Grammar Quiz',
        course: 'Arabic Language',
        dueDate: '2024-02-20',
        status: 'completed',
        grade: 88,
        maxPoints: 100,
        type: 'quiz'
      }
    ],
    assessments: [],
    evaluations: []
  },
  {
    id: 'STU003',
    fullName: 'Omar Khan',
    email: 'omar@umaracademy.com',
    contact: '+1-555-0127',
    program: 'Tajweed',
    level: 'Advanced',
    assignedTeacher: 'Ustadh Muhammad',
    enrolledDate: '2024-01-10',
    tuitionFee: 200,
    paymentStatus: 'current',
    status: 'active',
    parentName: 'Khan Ahmed',
    parentContact: '+1-555-0128',
    avatar: 'https://ui-avatars.com/api/?name=Omar+Khan&background=2E4D32&color=fff',
    address: {
      street: '789 Pine Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10003',
      country: 'USA'
    },
    schedule: {
      days: ['Monday', 'Wednesday', 'Friday'],
      startTime: '3:00 PM',
      endTime: '4:00 PM'
    },
    siblings: [],
    assignments: [
      {
        id: 'ASS003',
        title: 'Advanced Tajweed Rules',
        course: 'Tajweed',
        dueDate: '2024-02-25',
        status: 'pending',
        grade: null,
        maxPoints: 100,
        type: 'homework'
      }
    ],
    assessments: [],
    evaluations: []
  }
];

const sampleTeachers = [
  {
    id: 'TCH001',
    fullName: 'Ustadh Muhammad',
    email: 'teacher@umaracademy.com',
    contact: '+1-555-0129',
    department: 'Quran Studies',
    specialization: ['Quran Recitation', 'Tajweed', 'Arabic Language'],
    location: 'Local',
    employmentType: 'full-time',
    status: 'active',
    assignedStudents: ['STU001', 'STU003'],
    payroll: {
      monthlySalary: 3000,
      currency: 'USD',
      paymentType: 'monthly',
      bankAccount: '1234567890'
    },
    schedule: {
      workingDays: ['Monday', 'Wednesday', 'Friday'],
      workingHours: { start: '10:00 AM', end: '2:00 PM' },
      timezone: 'EST'
    },
    qualifications: [{
      degree: 'Islamic Studies',
      institution: 'Al-Azhar University',
      year: 2015,
      certifications: ['Quran Teaching Certificate']
    }],
    experience: {
      years: 8,
      previousInstitutions: ['Madrasah Al-Huda']
    },
    performance: {
      rating: 4.8,
      totalStudents: 15,
      completionRate: 95,
      attendanceRate: 98
    },
    permissions: {
      canViewAssessments: true,
      canEditAssessments: true,
      canViewEvaluations: true,
      canEditEvaluations: true,
      canViewFinancials: false,
      canManageSchedule: true,
      canContactParents: true
    },
    avatar: 'https://ui-avatars.com/api/?name=Ustadh+Muhammad&background=E7AA39&color=fff'
  },
  {
    id: 'TCH002',
    fullName: 'Ustadh Ali',
    email: 'ali@umaracademy.com',
    contact: '+1-555-0130',
    department: 'Arabic Studies',
    specialization: ['Arabic Language', 'Grammar', 'Literature'],
    location: 'Local',
    employmentType: 'part-time',
    status: 'active',
    assignedStudents: ['STU002'],
    payroll: {
      monthlySalary: 2000,
      currency: 'USD',
      paymentType: 'monthly',
      bankAccount: '0987654321'
    },
    schedule: {
      workingDays: ['Tuesday', 'Thursday'],
      workingHours: { start: '2:00 PM', end: '4:00 PM' },
      timezone: 'EST'
    },
    qualifications: [{
      degree: 'Arabic Literature',
      institution: 'Cairo University',
      year: 2018,
      certifications: ['Arabic Teaching Certificate']
    }],
    experience: {
      years: 5,
      previousInstitutions: ['Al-Noor Academy']
    },
    performance: {
      rating: 4.6,
      totalStudents: 8,
      completionRate: 92,
      attendanceRate: 95
    },
    permissions: {
      canViewAssessments: true,
      canEditAssessments: true,
      canViewEvaluations: true,
      canEditEvaluations: true,
      canViewFinancials: false,
      canManageSchedule: true,
      canContactParents: true
    },
    avatar: 'https://ui-avatars.com/api/?name=Ustadh+Ali&background=E7AA39&color=fff'
  }
];

const sampleAdmins = [
  {
    id: 'ADM001',
    fullName: 'Admin User',
    email: 'admin@umaracademy.com',
    contact: '+1-555-0131',
    department: 'Administration',
    role: 'admin',
    status: 'active',
    permissions: {
      canManageStudents: true,
      canManageTeachers: true,
      canViewFinancials: true,
      canManageCourses: true,
      canViewReports: true
    },
    avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=2E4D32&color=fff'
  }
];

// Function to populate localStorage
const populateFrontendData = () => {
  try {
    // Clear existing data
    localStorage.removeItem('umar_academy_students');
    localStorage.removeItem('umar_academy_teachers');
    localStorage.removeItem('umar_academy_admins');
    
    // Set new data
    localStorage.setItem('umar_academy_students', JSON.stringify(sampleStudents));
    localStorage.setItem('umar_academy_teachers', JSON.stringify(sampleTeachers));
    localStorage.setItem('umar_academy_admins', JSON.stringify(sampleAdmins));
    
    console.log('✅ Frontend data populated successfully!');
    console.log('📊 Students:', sampleStudents.length);
    console.log('👨‍🏫 Teachers:', sampleTeachers.length);
    console.log('👨‍💼 Admins:', sampleAdmins.length);
    
    // Reload the page to see the changes
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Error populating frontend data:', error);
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).populateFrontendData = populateFrontendData;
  console.log('🔧 Run populateFrontendData() in the browser console to populate data');
}

export { populateFrontendData, sampleStudents, sampleTeachers, sampleAdmins };








