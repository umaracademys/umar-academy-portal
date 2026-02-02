// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


/**
 * Script to create an Admin profile in the Admins collection
 * Links an existing User account to an Admin profile
 * 
 * Usage: node backend/createAdminProfile.js <email> [fullName] [contact]
 * Example: node backend/createAdminProfile.js faheem@gmail.com "Faheem Admin" "123-456-7890"
 */

const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Admin Schema (matching server.js)
const adminSchema = new mongoose.Schema({
  adminId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: { type: String, unique: true },
  contact: String,
  phoneNumber: String,
  permissions: mongoose.Schema.Types.Mixed,
  assignedDepartments: [String],
  hireDate: Date,
  status: { type: String, default: 'active' },
  avatar: String,
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

async function createAdminProfile(email, fullName, contact) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.error('❌ User not found!');
      console.error(`   No user with email "${email}" exists in the Users collection.`);
      console.error('\n💡 Please create the user first using:');
      console.error(`   node backend/createAdminUser.js "${email}" "<password>" "${fullName || 'Admin User'}"`);
      await mongoose.disconnect();
      process.exit(1);
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      console.error(`❌ User exists but has role "${user.role}", not "admin"`);
      console.error('   Admin profiles can only be created for users with role "admin" or "superadmin"');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (${user.role})`);
    console.log(`   User ID: ${user._id}\n`);

    // Check if admin profile already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase().trim() });
    
    if (existingAdmin) {
      console.log('⚠️  Admin profile already exists!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Full Name: ${existingAdmin.fullName}`);
      console.log(`   Status: ${existingAdmin.status}`);
      console.log(`   Admin ID: ${existingAdmin._id}`);
      
      // Option to update
      const updateProfile = process.argv.includes('--update');
      if (updateProfile) {
        console.log('\n🔄 Updating admin profile...');
        if (fullName) existingAdmin.fullName = fullName;
        if (contact) existingAdmin.contact = contact;
        existingAdmin.status = 'active';
        await existingAdmin.save();
        console.log('✅ Admin profile updated successfully!');
      } else {
        console.log('\n💡 To update the profile, run:');
        console.log(`   node backend/createAdminProfile.js "${email}" "${fullName || existingAdmin.fullName}" "${contact || ''}" --update`);
      }
      
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create admin profile
    console.log('👤 Creating admin profile...');
    
    const adminData = {
      adminId: `ADM${Date.now()}`,
      userId: user._id,
      fullName: fullName || user.name || 'Admin User',
      email: user.email,
      contact: contact || '',
      permissions: {
        // Default permissions (all false - can be updated later via UI)
        canManageTeachers: false,
        canManageStudents: false,
        canManageFinancials: false,
        canViewReports: false,
        canManagePermissions: false,
        canAccessMessages: false,
        canViewAllMessages: false,
        canModerateMessages: false,
        canAccessPdf: false,
        canManagePdfLibrary: false,
        canViewAllPdfAnnotations: false,
        canAccessHomework: false,
        canManageHomework: false,
        canViewAllHomework: false,
        canAccessEvaluations: false,
        canManageEvaluations: false,
        canApproveEvaluations: false,
        canAccessTickets: false,
        canCreateTickets: false,
        canReviewTickets: false,
        canApproveTickets: false,
        canFinalizeTickets: false,
        canManageTicketWorkflow: false,
        canAccessAttendance: false,
        canManageAttendance: false,
        canViewAttendanceReports: false,
        canAccessRecordings: false,
        canManageRecordings: false,
        canViewAllRecordings: false,
        canAccessMushaf: false,
        canManageMushaf: false,
        canViewAllMistakes: false,
        canAccessQaidah: false,
        canManageQaidah: false,
        canViewQaidahReports: false,
        canAccessAssignments: false,
        canManageAssignments: false,
        canBulkCreateAssignments: false,
        canManageStudentAssignments: false,
        canManageNotifications: false,
        canViewNotifications: false,
        canSendNotifications: false,
        canViewAnalytics: false,
        canExportReports: false,
        canViewSystemStats: false
      },
      assignedDepartments: [],
      hireDate: new Date(),
      status: 'active',
      avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || user.name || 'Admin')}&background=1F3224&color=fff`
    };

    const admin = new Admin(adminData);
    await admin.save();
    
    console.log('✅ Admin profile created successfully!\n');
    
    console.log('📋 Admin Profile Details:');
    console.log(`   Admin ID: ${admin.adminId}`);
    console.log(`   User ID: ${admin.userId}`);
    console.log(`   Full Name: ${admin.fullName}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Contact: ${admin.contact || 'Not set'}`);
    console.log(`   Status: ${admin.status}`);
    console.log(`   Created: ${admin.createdAt}`);
    
    console.log('\n✅ Admin profile is now linked to the user account!');
    console.log('   The user can now login and access admin features.');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin profile:', error);
    if (error.code === 11000) {
      console.error('   💡 An admin with this email already exists.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get arguments from command line
const email = process.argv[2] || 'faheem@gmail.com';
const fullName = process.argv[3] || 'Faheem Admin';
const contact = process.argv[4] || '';

if (!email) {
  console.error('❌ Error: Email is required');
  console.log('\nUsage: node backend/createAdminProfile.js <email> [fullName] [contact]');
  console.log('Example: node backend/createAdminProfile.js faheem@gmail.com "Faheem Admin" "123-456-7890"');
  process.exit(1);
}

createAdminProfile(email, fullName, contact);
