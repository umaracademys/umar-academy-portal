const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Connect to source database (ua-portal)
const sourceUri = 'mongodb://localhost:27017/ua_portal';
// Connect to target database (umar-academy-portal)
const targetUri = 'mongodb://localhost:5175/umar-academy-portal';

const run = async () => {
  try {
    console.log('🔄 Starting data import from ua-portal...');
    
    // Connect to source database
    const sourceConnection = await mongoose.createConnection(sourceUri);
    console.log('✅ Connected to source database (ua-portal)');
    
    // Connect to target database
    const targetConnection = await mongoose.createConnection(targetUri);
    console.log('✅ Connected to target database (umar-academy-portal)');
    
    // Define schemas for target database
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      role: String,
      password: String,
      avatar: String
    }, { timestamps: true });
    
    const User = targetConnection.model('User', userSchema);
    
    // Get only teachers and students from source database
    const sourceUsers = await sourceConnection.db.collection('users').find({
      role: { $in: ['teacher', 'user'] } // 'user' role maps to 'student'
    }).toArray();
    console.log(`📊 Found ${sourceUsers.length} teachers and students in source database`);
    
    // Process and import users
    let importedCount = 0;
    let skippedCount = 0;
    
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
          name: sourceUser.fullName || 'Unknown',
          email: sourceUser.email,
          role: sourceUser.role === 'user' ? 'student' : sourceUser.role, // Map 'user' to 'student'
          password: 'password123', // Default password
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(sourceUser.fullName || 'User')}&background=random&color=fff`
        };
        
        // Create user in target database
        await User.create(userData);
        console.log(`✅ Imported ${sourceUser.role === 'user' ? 'student' : sourceUser.role}: ${sourceUser.fullName} (${sourceUser.email})`);
        importedCount++;
        
      } catch (error) {
        console.error(`❌ Error importing user ${sourceUser.email}:`, error.message);
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✅ Imported: ${importedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users (already exist)`);
    console.log(`📊 Total processed: ${sourceUsers.length} users`);
    
    // Close connections
    await sourceConnection.close();
    await targetConnection.close();
    
    console.log('\n🎉 Data import completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

run();
