/**
 * Create Test Users for E2E Testing
 * 
 * Creates the test users required for E2E tests:
 * - Student: saria_mdn@yahoo.com / Maya2025!
 * - Teacher: rashid86amir82@gmail.com / Rashid2025
 * - Admin: umairrasheed969@gmail.com / Umair123!!!
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true },
  passwordChangeRequired: { type: Boolean, default: false }
}, { timestamps: true, collection: 'users' });

const User = mongoose.model('User', userSchema);

const createTestUsers = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test users to create
    const testUsers = [
      {
        name: 'Maya',
        email: 'saria_mdn@yahoo.com',
        role: 'student',
        password: 'Maya2025!',
        avatar: 'https://ui-avatars.com/api/?name=Maya&background=3b82f6&color=fff'
      },
      {
        name: 'Rashid',
        email: 'rashid86amir82@gmail.com',
        role: 'teacher',
        password: 'Rashid2025',
        avatar: 'https://ui-avatars.com/api/?name=Rashid&background=10b981&color=fff'
      },
      {
        name: 'Umair Rasheed',
        email: 'umairrasheed969@gmail.com',
        role: 'admin',
        password: 'Umair123!!!',
        avatar: 'https://ui-avatars.com/api/?name=Umair+Rasheed&background=2E4D32&color=fff'
      }
    ];

    console.log('📝 Creating/updating test users...\n');

    for (const userData of testUsers) {
      const existing = await User.findOne({ email: userData.email });
      
      if (existing) {
        // Update existing user password and ensure login is enabled
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        existing.password = hashedPassword;
        existing.name = userData.name;
        existing.role = userData.role;
        existing.loginEnabled = true;
        existing.passwordChangeRequired = false;
        await existing.save();
        console.log(`✅ Updated user: ${userData.email} (${userData.role})`);
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await User.create({
          name: userData.name,
          email: userData.email,
          role: userData.role,
          password: hashedPassword,
          avatar: userData.avatar,
          loginEnabled: true,
          passwordChangeRequired: false
        });
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      }
    }

    console.log('\n🎉 Test users setup complete!');
    console.log('\n🔑 Test Credentials:');
    console.log('Student: saria_mdn@yahoo.com / Maya2025!');
    console.log('Teacher: rashid86amir82@gmail.com / Rashid2025');
    console.log('Admin: umairrasheed969@gmail.com / Umair123!!!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    process.exit(1);
  }
};

createTestUsers();
