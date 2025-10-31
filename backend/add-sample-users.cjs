const mongoose = require('mongoose');

// Connect to target database
const targetUri = 'mongodb://localhost:5175/umar-academy-portal';

const run = async () => {
  try {
    console.log('🔄 Adding sample teachers and students...');
    
    // Connect to target database
    await mongoose.connect(targetUri);
    console.log('✅ Connected to target database (umar-academy-portal)');
    
    // Define schemas for target database
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      role: String,
      password: String,
      avatar: String
    }, { timestamps: true });
    
    const User = mongoose.model('User', userSchema);
    
    // Sample teachers and students data
    const sampleUsers = [
      // Teachers
      {
        name: 'Ustadh Ahmad',
        email: 'ahmad.teacher@umaracademy.org',
        role: 'teacher',
        password: 'password123',
        avatar: 'https://ui-avatars.com/api/?name=Ahmad+Teacher&background=8b5cf6&color=fff'
      },
      {
        name: 'Ustadh Fatima',
        email: 'fatima.teacher@umaracademy.org',
        role: 'teacher',
        password: 'password123',
        avatar: 'https://ui-avatars.com/api/?name=Fatima+Teacher&background=10b981&color=fff'
      },
      {
        name: 'Ustadh Ibrahim',
        email: 'ibrahim.teacher@umaracademy.org',
        role: 'teacher',
        password: 'password123',
        avatar: 'https://ui-avatars.com/api/?name=Ibrahim+Teacher&background=dc2626&color=fff'
      },
      // Students
      {
        name: 'Aisha Khan',
        email: 'aisha.student@umaracademy.org',
        role: 'student',
        password: 'password123',
        avatar: 'https://ui-avatars.com/api/?name=Aisha+Khan&background=2E4D32&color=fff'
      },
      {
        name: 'Omar Hassan',
        email: 'omar.student@umaracademy.org',
        role: 'student',
        password: 'password123',
        avatar: 'https://ui-avatars.com/api/?name=Omar+Hassan&background=1e40af&color=fff'
      },
      {
        name: 'Zainab Ali',
        email: 'zainab.student@umaracademy.org',
        role: 'student',
        password: 'password123',
        avatar: 'https://ui-avatars.com/api/?name=Zainab+Ali&background=7c3aed&color=fff'
      },
      {
        name: 'Yusuf Ahmed',
        email: 'yusuf.student@umaracademy.org',
        role: 'student',
        password: 'password123',
        avatar: 'https://ui-avatars.com/api/?name=Yusuf+Ahmed&background=ea580c&color=fff'
      }
    ];
    
    // Process and import users
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const userData of sampleUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          console.log(`⏭️  Skipping existing user: ${userData.email}`);
          skippedCount++;
          continue;
        }
        
        // Create user in target database
        await User.create(userData);
        console.log(`✅ Added ${userData.role}: ${userData.name} (${userData.email})`);
        importedCount++;
        
      } catch (error) {
        console.error(`❌ Error adding user ${userData.email}:`, error.message);
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✅ Added: ${importedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users (already exist)`);
    console.log(`📊 Total processed: ${sampleUsers.length} users`);
    
    // Close connection
    await mongoose.disconnect();
    
    console.log('\n🎉 Sample users added successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

run();






