// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Fix superadmin email to match login
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema (matching server.js)
const userSchema = new mongoose.Schema({
  name: String,
  fullName: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const fixEmail = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the existing superadmin user
    const existingSuperAdmin = await User.findOne({ 
      $or: [
        { email: 'superadmin@umaracademy.com' },
        { email: 'sadmin@umaracademy.org' },
        { role: 'superadmin' }
      ]
    });
    
    if (!existingSuperAdmin) {
      console.log('❌ No superadmin user found. Creating one...');
      
      // Create new superadmin
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newSuperAdmin = await User.create({
        name: 'Super Admin',
        fullName: 'Super Admin',
        email: 'sadmin@umaracademy.org',
        role: 'superadmin',
        password: hashedPassword,
        avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=2E4D32&color=fff',
        isActive: true
      });
      console.log('✅ Created superadmin:', newSuperAdmin.email);
    } else {
      // Update existing superadmin email and name
      if (existingSuperAdmin.email !== 'sadmin@umaracademy.org') {
        console.log(`📧 Updating superadmin email from ${existingSuperAdmin.email} to sadmin@umaracademy.org...`);
        existingSuperAdmin.email = 'sadmin@umaracademy.org';
      }
      
      // Ensure name fields are set
      if (!existingSuperAdmin.name && !existingSuperAdmin.fullName) {
        existingSuperAdmin.name = 'Super Admin';
        existingSuperAdmin.fullName = 'Super Admin';
        console.log('📝 Setting superadmin name...');
      }
      
      await existingSuperAdmin.save();
      console.log('✅ Superadmin updated successfully!');
    }

    // Verify
    const superAdmin = await User.findOne({ email: 'sadmin@umaracademy.org', role: 'superadmin' });
    if (superAdmin) {
      console.log('\n✅ Superadmin ready:');
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Name: ${superAdmin.name || superAdmin.fullName || 'Super Admin'}`);
      console.log(`   Role: ${superAdmin.role}`);
      console.log('\n🔑 You can now login with:');
      console.log('   Email: sadmin@umaracademy.org');
      console.log('   Password: (your existing password)');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing email:', error);
    process.exit(1);
  }
};

fixEmail();
