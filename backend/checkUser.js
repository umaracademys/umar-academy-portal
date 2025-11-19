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
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const emailToCheck = 'rashid86amir82@gmail.com';
    console.log(`🔍 Searching for user: ${emailToCheck}\n`);

    // Search in users collection
    const user = await User.findOne({ email: emailToCheck });
    
    if (user) {
      console.log('✅ USER FOUND:');
      console.log('   Email:', user.email);
      console.log('   Name:', user.name || 'N/A');
      console.log('   Role:', user.role || 'N/A');
      console.log('   ID:', user._id);
      console.log('   Created:', user.createdAt);
    } else {
      console.log('❌ USER NOT FOUND in users collection');
      
      // Also check students collection
      const Student = mongoose.model('Student', new mongoose.Schema({
        email: String,
        fullName: String
      }, { strict: false }));
      
      const student = await Student.findOne({ email: emailToCheck });
      if (student) {
        console.log('\n✅ FOUND IN STUDENTS COLLECTION:');
        console.log('   Email:', student.email);
        console.log('   Full Name:', student.fullName || 'N/A');
        console.log('   ID:', student._id);
      } else {
        console.log('\n❌ Also not found in students collection');
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


