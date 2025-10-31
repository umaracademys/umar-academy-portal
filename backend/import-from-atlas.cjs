const mongoose = require('mongoose');

// Source database (Atlas)
const sourceUri = 'mongodb+srv://umaracademys_db_user:GPaWHPbBwcC7K434@uaportal25.xuz62jo.mongodb.net/ua_portal';
// Target database (local)
const targetUri = 'mongodb://localhost:5175/umar-academy-portal';

const run = async () => {
  try {
    console.log('🔄 Starting data import from Atlas database...');
    
    // Connect to source database (Atlas)
    await mongoose.connect(sourceUri);
    console.log('✅ Connected to source database (Atlas)');
    
    const sourceDb = mongoose.connection.db;
    
    // Get teachers and students from source database
    const sourceUsers = await sourceDb.collection('users').find({
      role: { $in: ['teacher', 'user'] } // 'user' role maps to 'student'
    }).toArray();
    
    console.log(`📊 Found ${sourceUsers.length} teachers and students in Atlas database`);
    
    if (sourceUsers.length === 0) {
      console.log('⚠️  No users found in source database');
      await mongoose.disconnect();
      return;
    }
    
    // Show sample data
    console.log('\n📋 Sample users from Atlas:');
    sourceUsers.slice(0, 3).forEach(user => {
      console.log(`- ${user.fullName || user.name || 'Unknown'} (${user.email}) - ${user.role}`);
    });
    
    // Process and import users
    let importedCount = 0;
    let skippedCount = 0;
    
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
      avatar: String
    }, { timestamps: true });
    
    const User = mongoose.model('User', userSchema);
    
    for (const sourceUser of sourceUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: sourceUser.email });
        if (existingUser) {
          console.log(`⏭️  Skipping existing user: ${sourceUser.email}`);
          skippedCount++;
          continue;
        }
        
        // Transform data to match target schema
        const userData = {
          name: sourceUser.fullName || sourceUser.name || 'Unknown',
          email: sourceUser.email,
          role: sourceUser.role === 'user' ? 'student' : sourceUser.role,
          password: 'password123', // Default password
          avatar: sourceUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sourceUser.fullName || sourceUser.name || 'User')}&background=random&color=fff`
        };
        
        // Create user in target database
        await User.create(userData);
        console.log(`✅ Imported ${userData.role}: ${userData.name} (${userData.email})`);
        importedCount++;
        
      } catch (error) {
        console.error(`❌ Error importing user ${sourceUser.email}:`, error.message);
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✅ Imported: ${importedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users (already exist)`);
    console.log(`📊 Total processed: ${sourceUsers.length} users`);
    
    // Show final counts
    const finalCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📈 Final Database Counts:');
    finalCounts.forEach(item => {
      console.log(`${item._id}: ${item.count}`);
    });
    
    await mongoose.disconnect();
    
    console.log('\n🎉 Data import completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

run();




