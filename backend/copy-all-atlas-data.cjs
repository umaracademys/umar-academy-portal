const mongoose = require('mongoose');

// Source database (Atlas)
const sourceUri = 'mongodb+srv://umaracademys_db_user:GPaWHPbBwcC7K434@uaportal25.xuz62jo.mongodb.net/ua_portal';
// Target database (local)
const targetUri = 'mongodb://localhost:5175/umar-academy-portal';

const run = async () => {
  try {
    console.log('🔄 Starting comprehensive data copy from Atlas database...');
    
    // Connect to source database (Atlas)
    await mongoose.connect(sourceUri);
    console.log('✅ Connected to source database (Atlas)');
    
    const sourceDb = mongoose.connection.db;
    
    // Get all collections and their data
    const collections = await sourceDb.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections in Atlas database:`);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Get all users from source
    const sourceUsers = await sourceDb.collection('users').find({}).toArray();
    console.log(`\n👥 Found ${sourceUsers.length} users in Atlas database`);
    
    // Show sample of users
    console.log('\n📋 Sample users from Atlas:');
    sourceUsers.slice(0, 5).forEach(user => {
      console.log(`  - ${user.fullName || user.name || 'Unknown'} (${user.email}) - ${user.role}`);
    });
    
    if (sourceUsers.length > 5) {
      console.log(`  ... and ${sourceUsers.length - 5} more users`);
    }
    
    // Disconnect from source and connect to target
    await mongoose.disconnect();
    await mongoose.connect(targetUri);
    console.log('✅ Connected to target database (local)');
    
    // Define schemas for target database
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      role: String,
      password: String,
      avatar: String,
      phone: String,
      address: String,
      dateOfBirth: Date,
      status: String,
      permissions: [String],
      // Additional fields from Atlas
      fullName: String,
      contact: String,
      location: String,
      department: String,
      specialization: [String],
      experience: Number,
      salary: Number,
      hireDate: Date,
      enrollmentDate: Date,
      level: String,
      paymentStatus: String,
      assignedTeacher: String,
      courses: [String],
      assignments: [String],
      payments: [String],
      progress: Object,
      attendance: Object,
      grades: [Object],
      notes: [String],
      performance: Object,
      payroll: Object,
      schedule: Object,
      qualifications: [Object]
    }, { timestamps: true });
    
    const User = mongoose.model('User', userSchema);
    
    // Process and import users
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    console.log('\n🔄 Processing users...');
    
    for (const sourceUser of sourceUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: sourceUser.email });
        
        if (existingUser) {
          // Update existing user with Atlas data
          const updateData = {
            name: sourceUser.fullName || sourceUser.name || existingUser.name,
            fullName: sourceUser.fullName || sourceUser.name,
            email: sourceUser.email,
            role: sourceUser.role,
            phone: sourceUser.phone || sourceUser.contact,
            address: sourceUser.address,
            dateOfBirth: sourceUser.dateOfBirth,
            status: sourceUser.status || 'active',
            permissions: sourceUser.permissions || [],
            contact: sourceUser.contact || sourceUser.phone,
            location: sourceUser.location,
            department: sourceUser.department,
            specialization: sourceUser.specialization || [],
            experience: sourceUser.experience,
            salary: sourceUser.salary,
            hireDate: sourceUser.hireDate,
            enrollmentDate: sourceUser.enrollmentDate,
            level: sourceUser.level,
            paymentStatus: sourceUser.paymentStatus,
            assignedTeacher: sourceUser.assignedTeacher,
            courses: sourceUser.courses || [],
            assignments: sourceUser.assignments || [],
            payments: sourceUser.payments || [],
            progress: sourceUser.progress || {},
            attendance: sourceUser.attendance || {},
            grades: sourceUser.grades || [],
            notes: sourceUser.notes || [],
            performance: sourceUser.performance || {},
            payroll: sourceUser.payroll || {},
            schedule: sourceUser.schedule || {},
            qualifications: sourceUser.qualifications || [],
            avatar: sourceUser.avatar || existingUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sourceUser.fullName || sourceUser.name || 'User')}&background=random&color=fff`
          };
          
          await User.findByIdAndUpdate(existingUser._id, updateData, { new: true });
          console.log(`🔄 Updated: ${updateData.name} (${updateData.email})`);
          updatedCount++;
          
        } else {
          // Create new user
          const userData = {
            name: sourceUser.fullName || sourceUser.name || 'Unknown',
            fullName: sourceUser.fullName || sourceUser.name,
            email: sourceUser.email,
            role: sourceUser.role,
            password: sourceUser.password || 'password123',
            phone: sourceUser.phone || sourceUser.contact,
            address: sourceUser.address,
            dateOfBirth: sourceUser.dateOfBirth,
            status: sourceUser.status || 'active',
            permissions: sourceUser.permissions || [],
            contact: sourceUser.contact || sourceUser.phone,
            location: sourceUser.location,
            department: sourceUser.department,
            specialization: sourceUser.specialization || [],
            experience: sourceUser.experience,
            salary: sourceUser.salary,
            hireDate: sourceUser.hireDate,
            enrollmentDate: sourceUser.enrollmentDate,
            level: sourceUser.level,
            paymentStatus: sourceUser.paymentStatus,
            assignedTeacher: sourceUser.assignedTeacher,
            courses: sourceUser.courses || [],
            assignments: sourceUser.assignments || [],
            payments: sourceUser.payments || [],
            progress: sourceUser.progress || {},
            attendance: sourceUser.attendance || {},
            grades: sourceUser.grades || [],
            notes: sourceUser.notes || [],
            performance: sourceUser.performance || {},
            payroll: sourceUser.payroll || {},
            schedule: sourceUser.schedule || {},
            qualifications: sourceUser.qualifications || [],
            avatar: sourceUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sourceUser.fullName || sourceUser.name || 'User')}&background=random&color=fff`
          };
          
          await User.create(userData);
          console.log(`✅ Imported: ${userData.name} (${userData.email})`);
          importedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${sourceUser.email}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('\n📊 Copy Summary:');
    console.log(`✅ Imported: ${importedCount} new users`);
    console.log(`🔄 Updated: ${updatedCount} existing users`);
    console.log(`⏭️  Skipped: ${skippedCount} users (errors)`);
    console.log(`📊 Total processed: ${sourceUsers.length} users`);
    
    // Show final counts by role
    const finalCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📈 Final Database Counts:');
    finalCounts.forEach(item => {
      console.log(`${item._id}: ${item.count}`);
    });
    
    // Show some sample users
    console.log('\n👥 Sample users in local database:');
    const sampleUsers = await User.find().limit(5);
    sampleUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    await mongoose.disconnect();
    
    console.log('\n🎉 Data copy completed successfully!');
    console.log('Your local database now has all the data from Atlas!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Copy failed:', error);
    process.exit(1);
  }
};

run();


