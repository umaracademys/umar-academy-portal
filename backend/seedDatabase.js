const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:5175/umar-academy-portal';

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Seed Database
const seedDatabase = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Check if super admin exists
    const existingSuperAdmin = await User.findOne({ email: 'sadmin@umaracademy.org' });
    
    if (existingSuperAdmin) {
      console.log('⚠️  Super Admin already exists. Skipping seed.');
      process.exit(0);
    }

    console.log('📝 Creating initial users...');

    // Create Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'sadmin@umaracademy.org',
      role: 'superadmin',
      password: hashedPassword,
      avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=2E4D32&color=fff'
    });
    console.log('✅ Super Admin created:', superAdmin.email);

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@umaracademy.com',
      role: 'admin',
      password: hashedPassword,
      avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=2E4D32&color=fff'
    });
    console.log('✅ Admin created:', admin.email);

    // Create Teacher
    const teacher = await User.create({
      name: 'Teacher User',
      email: 'teacher@umaracademy.com',
      role: 'teacher',
      password: hashedPassword,
      avatar: 'https://ui-avatars.com/api/?name=Teacher+User&background=10b981&color=fff'
    });
    console.log('✅ Teacher created:', teacher.email);

    // Create Student
    const student = await User.create({
      name: 'Ahmed Ali',
      email: 'ahmed@umaracademy.com',
      role: 'student',
      password: hashedPassword,
      avatar: 'https://ui-avatars.com/api/?name=Ahmed+Ali&background=3b82f6&color=fff'
    });
    console.log('✅ Student created:', student.email);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log('Super Admin: sadmin@umaracademy.org / password123');
    console.log('Admin: admin@umaracademy.com / password123');
    console.log('Teacher: teacher@umaracademy.com / password123');
    console.log('Student: ahmed@umaracademy.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

