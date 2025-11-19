// Check what data is actually stored in MongoDB
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

const checkDatabase = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    console.log('📊 COLLECTIONS IN DATABASE:');
    console.log('='.repeat(50));
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await db.collection(collectionName).countDocuments();
      
      console.log(`\n📁 ${collectionName}: ${count} documents`);
      
      // Show sample documents for main collections
      if (count > 0 && ['users', 'students', 'teachers', 'assignments', 'tickets'].includes(collectionName)) {
        const sample = await db.collection(collectionName).findOne({});
        console.log('   Sample document keys:', Object.keys(sample || {}).join(', '));
        
        if (collectionName === 'users' && sample) {
          console.log('   Sample email:', sample.email || 'N/A');
          console.log('   Sample role:', sample.role || 'N/A');
        }
        if (collectionName === 'students' && sample) {
          console.log('   Sample email:', sample.email || 'N/A');
          console.log('   Sample fullName:', sample.fullName || 'N/A');
        }
        if (collectionName === 'teachers' && sample) {
          console.log('   Sample email:', sample.email || 'N/A');
          console.log('   Sample fullName:', sample.fullName || 'N/A');
        }
      }
    }
    
    // Check specific collections
    console.log('\n\n🔍 DETAILED CHECK:');
    console.log('='.repeat(50));
    
    // Check Users
    const userCount = await db.collection('users').countDocuments();
    console.log(`\n👤 Users: ${userCount}`);
    if (userCount > 0) {
      const users = await db.collection('users').find({}).limit(5).toArray();
      users.forEach(user => {
        console.log(`   - ${user.email || 'N/A'} (${user.role || 'N/A'})`);
      });
    }
    
    // Check Students
    const studentCount = await db.collection('students').countDocuments();
    console.log(`\n🎓 Students: ${studentCount}`);
    if (studentCount > 0) {
      const students = await db.collection('students').find({}).limit(5).toArray();
      students.forEach(student => {
        console.log(`   - ${student.fullName || student.email || 'N/A'} (${student.email || 'N/A'})`);
      });
    }
    
    // Check Teachers
    const teacherCount = await db.collection('teachers').countDocuments();
    console.log(`\n👨‍🏫 Teachers: ${teacherCount}`);
    if (teacherCount > 0) {
      const teachers = await db.collection('teachers').find({}).limit(5).toArray();
      teachers.forEach(teacher => {
        console.log(`   - ${teacher.fullName || teacher.email || 'N/A'} (${teacher.email || 'N/A'})`);
      });
    }
    
    // Check Assignments
    const assignmentCount = await db.collection('assignments').countDocuments();
    console.log(`\n📝 Assignments: ${assignmentCount}`);
    
    // Check Tickets
    const ticketCount = await db.collection('tickets').countDocuments();
    console.log(`\n🎫 Tickets: ${ticketCount}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkDatabase();


