import { connectDatabase } from '../config/database';
import { DatabaseService } from '../services/databaseService';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const populateSampleData = async () => {
  try {
    await connectDatabase();
    console.log('🌱 Starting sample data population...');

    // Create sample users
    console.log('👤 Creating sample users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create a student user
    const studentUser = await DatabaseService.createUser({
      fullName: 'Ahmed Ali',
      email: 'ahmed@umaracademy.com',
      password: hashedPassword,
      role: 'student',
      avatar: 'https://ui-avatars.com/api/?name=Ahmed+Ali&background=2E4D32&color=fff'
    });

    // Create a teacher user
    const teacherUser = await DatabaseService.createUser({
      fullName: 'Ustadh Muhammad',
      email: 'teacher@umaracademy.com',
      password: hashedPassword,
      role: 'teacher',
      avatar: 'https://ui-avatars.com/api/?name=Ustadh+Muhammad&background=E7AA39&color=fff'
    });

    // Create an admin user
    await DatabaseService.createUser({
      fullName: 'Admin User',
      email: 'admin@umaracademy.com',
      password: hashedPassword,
      role: 'admin',
      avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=2E4D32&color=fff'
    });

    console.log('✅ Users created successfully');

    // Create sample student
    console.log('👨‍🎓 Creating sample student...');
    const student = await DatabaseService.createStudent({
      userId: new mongoose.Types.ObjectId(studentUser._id),
      studentId: 'STU001',
      fullName: 'Ahmed Ali',
      email: 'ahmed@umaracademy.com',
      contact: '+1-555-0123',
      program: 'Quran Recitation',
      level: 'Beginner',
      assignedTeacher: 'Ustadh Muhammad',
      enrolledDate: new Date('2024-01-15'),
      tuitionFee: 150,
      paymentStatus: 'current',
      status: 'active',
      parentInfo: {
        name: 'Ali Hassan',
        contact: '+1-555-0124',
        relationship: 'Father'
      },
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      }
    });

    // Create sample teacher
    console.log('👨‍🏫 Creating sample teacher...');
    const teacher = await DatabaseService.createTeacher({
      userId: new mongoose.Types.ObjectId(teacherUser._id),
      teacherId: 'TCH001',
      fullName: 'Ustadh Muhammad',
      email: 'teacher@umaracademy.com',
      contact: '+1-555-0125',
      department: 'Quran Studies',
      specialization: ['Quran Recitation', 'Tajweed', 'Arabic Language'],
      location: 'Local',
      employmentType: 'full-time',
      status: 'active',
      assignedStudents: [student._id.toString()],
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
      }
    });

    // Create sample course
    console.log('📚 Creating sample course...');
    const course = await DatabaseService.createCourse({
      courseId: 'CRS001',
      title: 'Quran Recitation for Beginners',
      description: 'Learn proper Quran recitation with Tajweed rules',
      category: 'Islamic Studies',
      level: 'beginner',
      duration: 24, // 24 weeks
      price: 150,
      currency: 'USD',
      instructor: new mongoose.Types.ObjectId(teacher._id),
      maxStudents: 10,
      enrolledStudents: [new mongoose.Types.ObjectId(student._id)],
      schedule: {
        days: ['Monday', 'Wednesday', 'Friday'],
        time: '10:00 AM - 11:00 AM',
        timezone: 'UTC'
      },
      status: 'active',
      requirements: ['Basic Arabic reading', 'No prior Quran knowledge required'],
      learningOutcomes: ['Proper pronunciation', 'Basic Tajweed rules', 'Memorization techniques'],
      materials: [{
        title: 'Quran Text',
        type: 'pdf',
        url: '/materials/quran-text.pdf'
      }],
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-08-01')
    });

    // Create sample assignment
    console.log('📝 Creating sample assignment...');
    await DatabaseService.createAssignment({
      assignmentId: 'ASS001',
      title: 'Surah Al-Fatiha Memorization',
      description: 'Memorize Surah Al-Fatiha with proper Tajweed',
      course: new mongoose.Types.ObjectId(course._id),
      instructor: new mongoose.Types.ObjectId(teacher._id),
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

    // Create sample payment
    console.log('💳 Creating sample payment...');
    await DatabaseService.createPayment({
      paymentId: 'PAY001',
      student: new mongoose.Types.ObjectId(student._id),
      amount: 150,
      currency: 'USD',
      paymentType: 'tuition',
      paymentMethod: 'credit_card',
      status: 'completed',
      dueDate: new Date('2024-01-01'),
      paidDate: new Date('2024-01-15'),
      description: 'Monthly tuition fee',
      transactionId: 'TXN123456789'
    });

    // Create sample attendance
    console.log('📅 Creating sample attendance...');
    await DatabaseService.createAttendance({
      student: new mongoose.Types.ObjectId(student._id),
      course: new mongoose.Types.ObjectId(course._id),
      date: new Date('2024-02-01'),
      status: 'present',
      notes: 'Excellent participation'
    });

    console.log('🎉 Sample data population completed successfully!');
    console.log('\n📊 Created:');
    console.log('- 1 Student user (ahmed@umaracademy.com)');
    console.log('- 1 Teacher user (teacher@umaracademy.com)');
    console.log('- 1 Admin user (admin@umaracademy.com)');
    console.log('- 1 Student profile');
    console.log('- 1 Teacher profile');
    console.log('- 1 Course');
    console.log('- 1 Assignment');
    console.log('- 1 Payment record');
    console.log('- 1 Attendance record');
    
    console.log('\n🔑 Login credentials:');
    console.log('Student: ahmed@umaracademy.com / password123');
    console.log('Teacher: teacher@umaracademy.com / password123');
    console.log('Admin: admin@umaracademy.com / password123');
    console.log('Super Admin: sadmin@umaracademy.org / password123');

    // process.exit(0);
    
  } catch (error) {
    console.error('❌ Error populating sample data:', error);
    // process.exit(1);
  }
};

populateSampleData();


