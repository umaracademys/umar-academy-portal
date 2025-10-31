import { connectDatabase } from '../config/database';
import { DatabaseService } from '../services/databaseService';

const testConnection = async () => {
  try {
    console.log('🔌 Testing MongoDB connection...');
    await connectDatabase();
    
    console.log('📊 Testing database operations...');
    
    // Test getting dashboard stats
    const stats = await DatabaseService.getDashboardStats();
    console.log('✅ Dashboard stats retrieved:', stats);
    
    // Test getting all students
    const students = await DatabaseService.getAllStudents();
    console.log(`✅ Found ${students.length} students`);
    
    // Test getting all teachers
    const teachers = await DatabaseService.getAllTeachers();
    console.log(`✅ Found ${teachers.length} teachers`);
    
    // Test getting all courses
    const courses = await DatabaseService.getAllCourses();
    console.log(`✅ Found ${courses.length} courses`);
    
    console.log('🎉 All database operations successful!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
};

// Run the test
testConnection();

export default testConnection;

