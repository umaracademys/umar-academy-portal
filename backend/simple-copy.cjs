const mongoose = require('mongoose');

// Source database (Atlas)
const sourceUri = 'mongodb+srv://umaracademys_db_user:GPaWHPbBwcC7K434@uaportal25.xuz62jo.mongodb.net/ua_portal';
// Target database (local)
const targetUri = 'mongodb://localhost:5175/umar-academy-portal';

const run = async () => {
  try {
    console.log('🔄 Simple data copy from Atlas...');
    
    // Connect to source database (Atlas)
    await mongoose.connect(sourceUri);
    console.log('✅ Connected to source database (Atlas)');
    
    const sourceDb = mongoose.connection.db;
    
    // Get all users with their complete data
    const sourceUsers = await sourceDb.collection('users').find({}).toArray();
    console.log(`👥 Found ${sourceUsers.length} users in Atlas database`);
    
    // Get students collection
    const sourceStudents = await sourceDb.collection('students').find({}).toArray();
    console.log(`👨‍🎓 Found ${sourceStudents.length} students in Atlas database`);
    
    // Get teachers collection  
    const sourceTeachers = await sourceDb.collection('teachers').find({}).toArray();
    console.log(`👨‍🏫 Found ${sourceTeachers.length} teachers in Atlas database`);
    
    // Disconnect from source and connect to target
    await mongoose.disconnect();
    await mongoose.connect(targetUri);
    console.log('✅ Connected to target database (local)');
    
    const targetDb = mongoose.connection.db;
    
    // Update users with complete Atlas data
    console.log('\n🔄 Updating users with complete Atlas data...');
    
    for (const sourceUser of sourceUsers) {
      try {
        // Find corresponding student/teacher data
        const studentData = sourceStudents.find(s => s.userId && s.userId.toString() === sourceUser._id.toString());
        const teacherData = sourceTeachers.find(t => t.userId && t.userId.toString() === sourceUser._id.toString());
        
        // Prepare update data
        const updateData = {
          name: sourceUser.fullName || sourceUser.name || 'Unknown',
          fullName: sourceUser.fullName || sourceUser.name,
          email: sourceUser.email,
          role: sourceUser.role,
          phone: sourceUser.phone || sourceUser.contact,
          address: sourceUser.address,
          dateOfBirth: sourceUser.dateOfBirth,
          status: sourceUser.status || 'active',
          avatar: sourceUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sourceUser.fullName || sourceUser.name || 'User')}&background=random&color=fff`
        };
        
        // Add student-specific data
        if (studentData) {
          updateData.level = studentData.level;
          updateData.paymentStatus = studentData.paymentStatus;
          updateData.enrollmentDate = studentData.enrollmentDate;
          updateData.assignedTeacher = studentData.assignedTeacher;
          updateData.courses = studentData.courses || [];
          updateData.progress = studentData.progress || {};
          updateData.attendance = studentData.attendance || {};
          updateData.grades = studentData.grades || [];
          updateData.notes = studentData.notes || [];
        }
        
        // Add teacher-specific data
        if (teacherData) {
          updateData.specialization = teacherData.specialization || [];
          updateData.department = teacherData.department;
          updateData.experience = teacherData.experience;
          updateData.salary = teacherData.salary;
          updateData.hireDate = teacherData.hireDate;
          updateData.assignedStudents = teacherData.assignedStudents || [];
          updateData.performance = teacherData.performance || {};
          updateData.payroll = teacherData.payroll || {};
          updateData.schedule = teacherData.schedule || {};
          updateData.qualifications = teacherData.qualifications || [];
        }
        
        // Update user in target database
        await targetDb.collection('users').updateOne(
          { email: sourceUser.email },
          { $set: updateData },
          { upsert: true }
        );
        
        console.log(`✅ Updated: ${updateData.name} (${updateData.email}) - ${updateData.role}`);
        
      } catch (error) {
        console.error(`❌ Error updating user ${sourceUser.email}:`, error.message);
      }
    }
    
    // Show final counts
    const finalCounts = await targetDb.collection('users').aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]).toArray();
    
    console.log('\n📈 Final Database Counts:');
    finalCounts.forEach(item => {
      console.log(`${item._id}: ${item.count}`);
    });
    
    // Show sample users
    console.log('\n👥 Sample users with complete data:');
    const sampleUsers = await targetDb.collection('users').find({}).limit(5).toArray();
    sampleUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
      if (user.level) console.log(`    Level: ${user.level}`);
      if (user.specialization && user.specialization.length > 0) {
        console.log(`    Specialization: ${user.specialization.join(', ')}`);
      }
    });
    
    await mongoose.disconnect();
    
    console.log('\n🎉 Data copy completed successfully!');
    console.log('Your local database now has complete user data from Atlas!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Copy failed:', error);
    process.exit(1);
  }
};

run();


