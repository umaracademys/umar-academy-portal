import { connectDatabase } from '../config/database';
import { DatabaseService } from '../services/databaseService';
import bcrypt from 'bcryptjs';

const checkAndPopulateData = async () => {
  try {
    await connectDatabase();
    console.log('🔍 Checking existing data...');

    // Check what data already exists
    const stats = await DatabaseService.getDashboardStats();
    console.log('📊 Current database stats:', stats);

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Check if we need to create a student user
    let studentUser;
    try {
      studentUser = await DatabaseService.getUserByEmail('ahmed@umaracademy.com');
      console.log('✅ Student user already exists');
    } catch (error) {
      console.log('👤 Creating student user...');
      studentUser = await DatabaseService.createUser({
        fullName: 'Ahmed Ali',
        email: 'ahmed@umaracademy.com',
        password: hashedPassword,
        role: 'student',
        avatar: 'https://ui-avatars.com/api/?name=Ahmed+Ali&background=2E4D32&color=fff'
      });
      console.log('✅ Student user created');
    }

    // Check if we need to create a teacher user
    let teacherUser;
    try {
      teacherUser = await DatabaseService.getUserByEmail('teacher@umaracademy.com');
      console.log('✅ Teacher user already exists');
    } catch (error) {
      console.log('👨‍🏫 Creating teacher user...');
      teacherUser = await DatabaseService.createUser({
        fullName: 'Ustadh Muhammad',
        email: 'teacher@umaracademy.com',
        password: hashedPassword,
        role: 'teacher',
        avatar: 'https://ui-avatars.com/api/?name=Ustadh+Muhammad&background=E7AA39&color=fff'
      });
      console.log('✅ Teacher user created');
    }

    // Check if we need to create an admin user
    let adminUser;
    try {
      adminUser = await DatabaseService.getUserByEmail('admin@umaracademy.com');
      console.log('✅ Admin user already exists');
    } catch (error) {
      console.log('👨‍💼 Creating admin user...');
      adminUser = await DatabaseService.createUser({
        fullName: 'Admin User',
        email: 'admin@umaracademy.com',
        password: hashedPassword,
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=2E4D32&color=fff'
      });
      console.log('✅ Admin user created');
    }

    // Check if we need to create a student profile
    let student;
    try {
      const students = await DatabaseService.getAllStudents();
      student = students.find(s => s.email === 'ahmed@umaracademy.com');
      if (student) {
        console.log('✅ Student profile already exists');
      } else {
        throw new Error('Student profile not found');
      }
    } catch (error) {
      console.log('👨‍🎓 Creating student profile...');
      student = await DatabaseService.createStudent({
        userId: studentUser._id,
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
      console.log('✅ Student profile created');
    }

    // Check if we need to create a teacher profile
    let teacher;
    try {
      const teachers = await DatabaseService.getAllTeachers();
      teacher = teachers.find(t => t.email === 'teacher@umaracademy.com');
      if (teacher) {
        console.log('✅ Teacher profile already exists');
      } else {
        throw new Error('Teacher profile not found');
      }
    } catch (error) {
      console.log('👨‍🏫 Creating teacher profile...');
      teacher = await DatabaseService.createTeacher({
        userId: teacherUser._id,
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
      console.log('✅ Teacher profile created');
    }

    // Get final stats
    const finalStats = await DatabaseService.getDashboardStats();
    console.log('\n🎉 Data check completed!');
    console.log('📊 Final database stats:', finalStats);
    
    console.log('\n🔑 Available login credentials:');
    console.log('Student: ahmed@umaracademy.com / password123');
    console.log('Teacher: teacher@umaracademy.com / password123');
    console.log('Admin: admin@umaracademy.com / password123');
    console.log('Super Admin: sadmin@umaracademy.org / password123');

    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking/populating data:', error);
    process.exit(1);
  }
};

checkAndPopulateData();








