// Check if a user exists by email
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema (matching server.js)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const checkUser = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const emailToCheck = 'Rabyya@live.com';
    
    // Also check login status
    console.log('\n🔐 Checking login status...');
    console.log(`🔍 Searching for user: ${emailToCheck}\n`);

    // First, show recent users to see what's in the database
    const db = mongoose.connection.db;
    const recentUsers = await db.collection('users').find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    console.log(`📊 Recent users in database (last 10):`);
    if (recentUsers.length === 0) {
      console.log('   No users found in database');
    } else {
      recentUsers.forEach((u, idx) => {
        console.log(`   ${idx + 1}. ${u.email} - ${u.name || 'N/A'} - ${u.role || 'N/A'} - Created: ${u.createdAt || 'N/A'}`);
      });
    }
    console.log('');

    // Search in users collection (case-insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${emailToCheck}$`, 'i') }
    });
    
    if (user) {
      console.log('✅ USER FOUND IN USERS COLLECTION:');
      console.log('   Email:', user.email);
      console.log('   Name:', user.name || user.fullName || 'N/A');
      console.log('   Role:', user.role || 'N/A');
      console.log('   ID:', user._id);
      console.log('   Created:', user.createdAt);
      console.log('   Login Enabled:', user.loginEnabled !== false ? '✅ YES' : '❌ NO');
      console.log('   Has Password:', user.password ? '✅ YES' : '❌ NO');
      console.log('   Password Hash:', user.password ? (user.password.substring(0, 20) + '...') : 'N/A');
      console.log('   Full document:', JSON.stringify(user.toObject(), null, 2));
    } else {
      console.log('❌ USER NOT FOUND in users collection (case-insensitive search)');
      
      // Also check students collection
      const Student = mongoose.model('Student', new mongoose.Schema({
        email: String,
        fullName: String
      }, { strict: false }));
      
      const student = await Student.findOne({ 
        email: { $regex: new RegExp(`^${emailToCheck}$`, 'i') }
      });
      if (student) {
        console.log('\n✅ FOUND IN STUDENTS COLLECTION:');
        console.log('   Email:', student.email);
        console.log('   Full Name:', student.fullName || 'N/A');
        console.log('   ID:', student._id);
        console.log('   Full document:', JSON.stringify(student.toObject(), null, 2));
      } else {
        console.log('\n❌ Also not found in students collection');
      }
      
      // Check teachers collection
      const Teacher = mongoose.model('Teacher', new mongoose.Schema({
        email: String,
        fullName: String
      }, { strict: false }));
      
      const teacher = await Teacher.findOne({ 
        email: { $regex: new RegExp(`^${emailToCheck}$`, 'i') }
      });
      if (teacher) {
        console.log('\n✅ FOUND IN TEACHERS COLLECTION:');
        console.log('   Email:', teacher.email);
        console.log('   Full Name:', teacher.fullName || 'N/A');
        console.log('   ID:', teacher._id);
        console.log('   Full document:', JSON.stringify(teacher.toObject(), null, 2));
      }
      
      // Check all collections for any email containing "rabyya"
      console.log('\n🔍 Searching all collections for emails containing "rabyya"...');
      const collections = await db.listCollections().toArray();
      
      for (const collectionInfo of collections) {
        const collection = db.collection(collectionInfo.name);
        const docs = await collection.find({
          email: { $regex: /rabyya/i }
        }).limit(5).toArray();
        
        if (docs.length > 0) {
          console.log(`\n📁 Found ${docs.length} document(s) in "${collectionInfo.name}" collection:`);
          docs.forEach((doc, idx) => {
            console.log(`   ${idx + 1}. Email: ${doc.email || 'N/A'}, Name: ${doc.name || doc.fullName || 'N/A'}, Role: ${doc.role || 'N/A'}`);
          });
        }
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkUser();


