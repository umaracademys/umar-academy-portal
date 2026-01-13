/**
 * MongoDB Interactive Shell Helper
 * Provides a simple way to query MongoDB collections
 * 
 * Usage: node backend/mongoShell.js
 */

const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// User Schema
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

// Student Schema
const studentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.model('Student', studentSchema);

// Teacher Schema
const teacherSchema = new mongoose.Schema({}, { strict: false });
const Teacher = mongoose.model('Teacher', teacherSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({}, { strict: false });
const Admin = mongoose.model('Admin', adminSchema);

async function mongoShell() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB!\n');
    
    const db = mongoose.connection.db;
    console.log(`📊 Database: ${db.databaseName}\n`);
    
    // Export models to global scope for easy access
    global.User = User;
    global.Student = Student;
    global.Teacher = Teacher;
    global.Admin = Admin;
    global.db = db;
    global.mongoose = mongoose;
    
    console.log('💡 Available models: User, Student, Teacher, Admin');
    console.log('💡 Available objects: db (database), mongoose');
    console.log('\n📝 Example queries:');
    console.log('   await User.find({}).limit(5)');
    console.log('   await Student.countDocuments({})');
    console.log('   await User.findOne({ email: "example@email.com" })');
    console.log('\n✅ Ready! You can now run queries in the Node.js REPL.');
    console.log('   Type queries and press Enter to execute.\n');
    
    // Start REPL
    const repl = require('repl');
    const r = repl.start('mongo> ');
    
    r.context.User = User;
    r.context.Student = Student;
    r.context.Teacher = Teacher;
    r.context.Admin = Admin;
    r.context.db = db;
    r.context.mongoose = mongoose;
    
    r.on('exit', async () => {
      console.log('\n🛑 Disconnecting from MongoDB...');
      await mongoose.disconnect();
      console.log('✅ Disconnected');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

mongoShell();
