import { connectDatabase } from '../config/database';
import { DatabaseService } from '../services/databaseService';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Student from '../models/Student';
import Teacher from '../models/Teacher';
import Course from '../models/Course';
import Assignment from '../models/Assignment';
import Payment from '../models/Payment';
import Attendance from '../models/Attendance';

const seedData = async () => {
  try {
    await connectDatabase();
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Teacher.deleteMany({}),
      Course.deleteMany({}),
      Assignment.deleteMany({}),
      Payment.deleteMany({}),
      Attendance.deleteMany({})
    ]);

    // Create users
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const superAdminUser = await DatabaseService.createUser({
      fullName: 'Super Admin',
      email: 'superadmin@umaracademy.com',
      password: hashedPassword,
      role: 'superadmin',
      avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=2E4D32&color=fff'
    });

    const adminUser = await DatabaseService.createUser({
      fullName: 'Admin User',
      email: 'admin@umaracademy.com',
      password: hashedPassword,
      role: 'admin',
      avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=2E4D32&color=fff'
    });

    // Create teachers
    console.log('👨‍🏫 Creating teachers...');
    const teacher1 = await DatabaseService.createTeacher({
      userId: superAdminUser._id,
      teacherId: 'T001',
      fullName: 'Umar Farooq',
      email: 'umar.farooq@umaracademy.com',
      contact: '+1-555-0101',
      department: 'Quran Studies',
      specialization: ['Hifz', 'Tajweed', 'Arabic'],
      location: 'New York, USA',
      employmentType: 'full-time',
      status: 'active',
      assignedStudents: [],
      payroll: {
        monthlySalary: 3000,
        currency: 'USD',
        paymentType: 'monthly'
      },
      schedule: {
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        workingHours: { start: '09:00', end: '17:00' },
        timezone: 'America/New_York'
      },
      qualifications: [{
        degree: 'Masters in Islamic Studies',
        institution: 'Al-Azhar University',
        year: 2015,
        certifications: ['Quran Teacher Certification', 'Arabic Language Teaching']
      }],
      experience: {
        years: 8,
        previousInstitutions: ['Islamic Center of New York', 'Al-Noor Academy']
      },
      performance: {
        rating: 4.8,
        totalStudents: 25,
        completionRate: 95,
        attendanceRate: 98
      },
      avatar: 'https://ui-avatars.com/api/?name=Umar+Farooq&background=E7AA39&color=fff'
    });

    const teacher2 = await DatabaseService.createTeacher({
      userId: adminUser._id,
      teacherId: 'T002',
      fullName: 'Aisha Ahmed',
      email: 'aisha.ahmed@umaracademy.com',
      contact: '+1-555-0102',
      department: 'Quran Studies',
      specialization: ['Tajweed', 'Recitation', 'Memorization'],
      location: 'Toronto, Canada',
      employmentType: 'part-time',
      status: 'active',
      assignedStudents: [],
      payroll: {
        monthlySalary: 2000,
        currency: 'USD',
        paymentType: 'monthly'
      },
      schedule: {
        workingDays: ['Monday', 'Wednesday', 'Friday'],
        workingHours: { start: '14:00', end: '18:00' },
        timezone: 'America/Toronto'
      },
      qualifications: [{
        degree: 'Bachelors in Islamic Studies',
        institution: 'University of Toronto',
        year: 2018,
        certifications: ['Tajweed Certification', 'Quran Recitation']
      }],
      experience: {
        years: 5,
        previousInstitutions: ['Toronto Islamic Center']
      },
      performance: {
        rating: 4.6,
        totalStudents: 15,
        completionRate: 92,
        attendanceRate: 96
      },
      avatar: 'https://ui-avatars.com/api/?name=Aisha+Ahmed&background=E7AA39&color=fff'
    });

    // Create students
    console.log('👨‍🎓 Creating students...');
    const student1 = await DatabaseService.createStudent({
      userId: superAdminUser._id,
      studentId: 'S001',
      fullName: 'Ahmed Hassan',
      email: 'ahmed.hassan@student.com',
      contact: '+1-555-0201',
      program: 'Hifz Program',
      level: 'Beginner',
      assignedTeacher: 'Umar Farooq',
      enrolledDate: new Date('2024-01-15'),
      tuitionFee: 200,
      paymentStatus: 'current',
      status: 'active',
      parentInfo: {
        name: 'Hassan Ali',
        contact: '+1-555-0202',
        relationship: 'Father'
      },
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      },
      avatar: 'https://ui-avatars.com/api/?name=Ahmed+Hassan&background=2E4D32&color=fff'
    });

    const student2 = await DatabaseService.createStudent({
      userId: adminUser._id,
      studentId: 'S002',
      fullName: 'Fatima Khan',
      email: 'fatima.khan@student.com',
      contact: '+1-555-0203',
      program: 'Tajweed Program',
      level: 'Intermediate',
      assignedTeacher: 'Aisha Ahmed',
      enrolledDate: new Date('2024-02-01'),
      tuitionFee: 150,
      paymentStatus: 'current',
      status: 'active',
      parentInfo: {
        name: 'Khan Family',
        contact: '+1-555-0204',
        relationship: 'Parents'
      },
      address: {
        street: '456 Oak Avenue',
        city: 'Toronto',
        state: 'ON',
        zipCode: 'M5V 3A8',
        country: 'Canada'
      },
      avatar: 'https://ui-avatars.com/api/?name=Fatima+Khan&background=2E4D32&color=fff'
    });

    // Create courses
    console.log('📚 Creating courses...');
    const course1 = await DatabaseService.createCourse({
      courseId: 'C001',
      title: 'Complete Hifz Program',
      description: 'Comprehensive Quran memorization program for beginners to advanced students',
      category: 'Quran Studies',
      level: 'beginner',
      duration: 52,
      price: 200,
      currency: 'USD',
      instructor: teacher1._id,
      maxStudents: 20,
      enrolledStudents: [student1._id],
      schedule: {
        days: ['Monday', 'Wednesday', 'Friday'],
        time: '10:00 AM - 11:30 AM',
        timezone: 'America/New_York'
      },
      status: 'active',
      requirements: ['Basic Arabic reading', 'Commitment to daily practice'],
      learningOutcomes: ['Complete Quran memorization', 'Proper recitation', 'Understanding of Tajweed rules'],
      materials: [{
        title: 'Quran Text',
        type: 'pdf',
        url: '/materials/quran-text.pdf'
      }],
      startDate: new Date('2024-01-15'),
      endDate: new Date('2025-01-15')
    });

    const course2 = await DatabaseService.createCourse({
      courseId: 'C002',
      title: 'Tajweed Mastery',
      description: 'Advanced Tajweed rules and proper Quran recitation',
      category: 'Quran Studies',
      level: 'intermediate',
      duration: 24,
      price: 150,
      currency: 'USD',
      instructor: teacher2._id,
      maxStudents: 15,
      enrolledStudents: [student2._id],
      schedule: {
        days: ['Tuesday', 'Thursday'],
        time: '2:00 PM - 3:30 PM',
        timezone: 'America/Toronto'
      },
      status: 'active',
      requirements: ['Basic Quran reading', 'Previous Tajweed knowledge'],
      learningOutcomes: ['Master all Tajweed rules', 'Perfect recitation', 'Teaching capabilities'],
      materials: [{
        title: 'Tajweed Rules Guide',
        type: 'pdf',
        url: '/materials/tajweed-guide.pdf'
      }],
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-08-01')
    });

    // Create assignments
    console.log('📝 Creating assignments...');
    const assignment1 = await DatabaseService.createAssignment({
      assignmentId: 'A001',
      title: 'Surah Al-Fatiha Memorization',
      description: 'Memorize Surah Al-Fatiha with proper Tajweed',
      course: course1._id,
      instructor: teacher1._id,
      dueDate: new Date('2024-02-15'),
      maxPoints: 100,
      type: 'homework',
      instructions: 'Please memorize Surah Al-Fatiha and submit a voice recording',
      attachments: [{
        name: 'Surah Al-Fatiha Text',
        url: '/materials/al-fatiha.pdf',
        type: 'pdf'
      }],
      submissions: [],
      status: 'published'
    });

    const assignment2 = await DatabaseService.createAssignment({
      assignmentId: 'A002',
      title: 'Tajweed Rules Quiz',
      description: 'Test your knowledge of basic Tajweed rules',
      course: course2._id,
      instructor: teacher2._id,
      dueDate: new Date('2024-02-20'),
      maxPoints: 100,
      type: 'quiz',
      instructions: 'Complete the quiz covering Tajweed rules we studied',
      attachments: [{
        name: 'Tajweed Rules Reference',
        url: '/materials/tajweed-rules.pdf',
        type: 'pdf'
      }],
      submissions: [],
      status: 'published'
    });

    // Create payments
    console.log('💰 Creating payments...');
    const payment1 = await DatabaseService.createPayment({
      paymentId: 'P001',
      student: student1._id,
      amount: 200,
      currency: 'USD',
      paymentType: 'tuition',
      status: 'completed',
      paymentMethod: 'bank_transfer',
      transactionId: 'TXN001',
      dueDate: new Date('2024-01-15'),
      paidDate: new Date('2024-01-15'),
      description: 'Monthly tuition fee for Hifz Program',
      receipt: '/receipts/P001.pdf'
    });

    const payment2 = await DatabaseService.createPayment({
      paymentId: 'P002',
      student: student2._id,
      amount: 150,
      currency: 'USD',
      paymentType: 'tuition',
      status: 'completed',
      paymentMethod: 'credit_card',
      transactionId: 'TXN002',
      dueDate: new Date('2024-02-01'),
      paidDate: new Date('2024-02-01'),
      description: 'Monthly tuition fee for Tajweed Program',
      receipt: '/receipts/P002.pdf'
    });

    // Create attendance records
    console.log('📊 Creating attendance records...');
    const attendance1 = await DatabaseService.createAttendance({
      student: student1._id,
      course: course1._id,
      date: new Date('2024-01-15'),
      status: 'present',
      notes: 'Excellent participation',
      markedBy: teacher1._id
    });

    const attendance2 = await DatabaseService.createAttendance({
      student: student2._id,
      course: course2._id,
      date: new Date('2024-02-01'),
      status: 'present',
      notes: 'Good progress',
      markedBy: teacher2._id
    });

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Created:');
    console.log(`   - 2 Users (1 Super Admin, 1 Admin)`);
    console.log(`   - 2 Teachers`);
    console.log(`   - 2 Students`);
    console.log(`   - 2 Courses`);
    console.log(`   - 2 Assignments`);
    console.log(`   - 2 Payments`);
    console.log(`   - 2 Attendance records`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed script
seedData();

export default seedData;

