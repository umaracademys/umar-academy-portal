// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


/**
 * Script to verify if students from exported CSV exist in the database
 * Usage: node backend/verifyStudentList.js
 */

// Load dotenv if available (for local development)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, that's okay - use environment variables directly
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true }
}, { strict: false, timestamps: true });

// Student Schema
const studentSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);

// List of students from CSV export
const studentsFromCSV = [
  { name: 'Aaliyah Anam', email: 'mhd.eliyas@gmail.com', password: 'Yn7^i!A4Z!$p' },
  { name: 'Aaqib Dolani', email: '123@gmail.com', password: 'Zq1^#0b*pCMH' },
  { name: 'Aasiya Khan', email: 'shehnila.khan84@gmail.com', password: '8@bvJ@ylJU&z' },
  { name: 'Abdul Aziz', email: 'dxb.mohsinsadiq@gmail.com', password: 'skT*N9dNY$9E' },
  { name: 'Abdullah Memon', email: 'cadir.shaikh@gmail.com', password: '^A4tFB%hc^bF' },
  { name: 'Abdurrahman', email: 'shahabalikhan@gmail.com', password: '0BD*yNKT*zSQ' },
  { name: 'Abdurrehman Sayed', email: 'zafarsayed@hotmail.com', password: '5%vGODFryGKT' },
  { name: 'AbuBakr Mohamad', email: 'acdullah998@homail.com', password: 'r@^LKlX6s8jq' },
  { name: 'Adam Almasri', email: 'h.doukmark@hotmail.com', password: 'yCUPXu5!jCw^' },
  { name: 'Adam Dano', email: 'adamd@gmail.com', password: 'BL$LB5WajA9!' },
  { name: 'Ahmed Qureshi', email: 'sadafrauf87@yahoo.com', password: 'LYMm2w2@&v6U' },
  { name: 'Aisha Imran', email: 'mimr_021@hotmail.com', password: 'iuCU8gGS5qX&' },
  { name: 'Akef Mohammed', email: 'akef@gmail.com', password: 'a*$TZ&7%AxAj' },
  { name: 'Alaaya Anwari', email: 'onaiza.manda@yahoo.com', password: 'wsWZ@if&84D4' },
  { name: 'Amina Rahman', email: 'dr.aminarahman2@gmail.com', password: '0u6jFT8AY@K5' },
  { name: 'Arham Khan', email: 'azhar.aleem.khan@gmail.com', password: 'XZIMeI%^6Ga4' },
  { name: 'Arsal Hamid', email: 'arsalhamid0410@gmail.com', password: 'DhjV5Ns&!ajl' },
  { name: 'Asma Rasheed', email: 'asma@outlook.com', password: 'K&$6uVXuR5#G' },
  { name: 'Atif Muneer', email: 'muneer.hallaji@gmail.com', password: 'qYthMg0$3cfB' },
  { name: 'Ayesha Rasheed', email: 'Abdulrasheed.ak@outlook.com', password: 'xiJ*z%P0Ig&R' },
  { name: 'Ayesha Shaikh', email: 'irfan.shk@gmail.com', password: 'z&w5SRWy&4J&' },
  { name: 'azfar', email: 'azfar@gmail.com', password: 'BX&L9VFh5c7#' },
  { name: 'Azfar Ul Hussain', email: 'azfarulhussain79@gmail.com', password: 'eT0mXpmCC$51' },
  { name: 'Basim Saad', email: 'basim.r2010@gmail.com', password: 'pF@N44vDOTgj' },
  { name: 'Esam Rahimeh', email: 'saif.r007@hotmail.com', password: 'NvSm8Xm!&s4D' },
  { name: 'Faaris Rahimeh', email: 'faaris@hotmail.com', password: '#qXzZPeOJh9C' },
  { name: 'Faaris Rashid', email: 'Ruba.shahnaz@gmail.com', password: 'QDFJD@O1yLCk' },
  { name: 'Fatima Hamideh', email: 'fbhamideh3@gmail.com', password: 'c*CWF*5LTWla' },
  { name: 'Fatima Rahman', email: 'Fatima.rahmannn@gmail.com', password: '3mJEbER$&7eH' },
  { name: 'Hafsah Memon', email: 'mumarr21@gmail.com', password: 'O9vn^l1tg#r^' },
  { name: 'Hamnah Abdul Samad', email: 'farhanasamad.ca@gmail.com', password: '3^4DfjU&SZ0Q' },
  { name: 'Hanadi hamideh', email: 'munamaher@gmail.com', password: '!gDnCzeYb932' },
  { name: 'Harris Siddiqui', email: 'hsidd422@gmail.com', password: 'oPvf&1@nUFHq' },
  { name: 'Hassan Bickiya', email: 'anwerb@sbcglobal.net', password: 'SiNXIqB9e0E!' },
  { name: 'Hayder Chaudhery', email: 'hayder@gmail.com', password: 'apAnBECF*fV1' },
  { name: 'Humna Zubair', email: 'zubair1599@gmail.com', password: 'nH6e*2Gu8$He' },
  { name: 'Ibrahim Ahsan', email: 'ahsan.riaz1@gmail.com', password: 'rOD!y7jqmtOx' },
  { name: 'Irfa Faria', email: 'mj.619488@gmail.com', password: '6xB2aEide7&S' },
  { name: 'Isa Hamid', email: 'farwafarooq76@gmail.com', password: 'Yw6%M#2UQw@Y' },
  { name: 'Jaad Dano', email: 'mddt80888@yahoo.com', password: 'Mdl0$4zu@Gvp' },
  { name: 'Madiha Abdullah', email: 'riaz0912@gmail.com', password: '09Ae9Xv^EW4S' },
  { name: 'Mansoor Khalili', email: 'mansoorakhalili@gmail.com', password: 'qpQoigI%06gQ' },
  { name: 'Maya Sirafi', email: 'saria_mdn@yahoo.com', password: 'u7mc8Vu#vpl3' },
  { name: 'Mohid Muhammad Zubair', email: 'maleeha_01@hotmail.com', password: '2Ue%7bhS5$Sm' },
  { name: 'Muhammad Ayaan', email: 'misssusan2009@gmail.com', password: 'O9#Tz0p*C3#0' },
  { name: 'Musa Memon', email: 'saraumar93@gmail.com', password: 'Ost9aKM6CkK$' },
  { name: 'Mysha Noor', email: 'mehwishayubi24@gmail.com', password: 'M2g95Re#q1@B' },
  { name: 'Nabeel Mohamed', email: 'Mhd.eliyas@gmail.com', password: '&JUDkBQkB#P9' },
  { name: 'Naseebah Iqbal', email: 'nasebah@gmail.com', password: 'r^m@J4xoe8$V' },
  { name: 'Naseebah Iqbal', email: 'sni087311@gmail.com', password: '$5^w!8Z@5DN5' },
  { name: 'Noah Dano', email: 'mddt80888@yahoo.com', password: '0hTUOIC#uPcq' },
  { name: 'Omar Almasri', email: 'h.doukmak@yahoo.com', password: 'wGo*y4F9ifa3' },
  { name: 'Qaseem Malik', email: 'samradurvesh@gmail.com', password: 'U1ea7T*SH&gb' },
  { name: 'Rashid Moid', email: 'habeebaraoof@gmail.com', password: 'A@@pas*3w8h4' },
  { name: 'Rayan Mohamed', email: 'tahn7860@gmail.com', password: 'f%$UMQj6eW^V' },
  { name: 'Sadad Raseen', email: 'mdzaman.usa11@gmail.com', password: 'DrQq0$b2v@Do' },
  { name: 'Safa hamza', email: 'jackyhamza@yahoo.com', password: 'ySn!e$bks5s4' },
  { name: 'Safwan mohammed', email: 'sameer229@hotmail.com', password: 'XO&moMt&5i#^' },
  { name: 'Samira Mohammed', email: 'samira@hotmail.com', password: 's%A*%c9v0F%U' },
  { name: 'Sara Ahmad', email: 'Fazil.ahmd@gmail.com', password: '03YWw@whCQsN' },
  { name: 'Sarah Rahman', email: 'srahman1436@gmail.com', password: 'HgPR4Zu5$UZo' },
  { name: 'Sidra Alzayed', email: 'ramaaljarrah@gmail.com', password: 'BdJ^&AvgA5@l' },
  { name: 'Sumiyyah Memon', email: 'sumiyahm@gmail.com', password: 'j$el@3KyUY^c' },
  { name: 'Tareq Alzayed', email: 'tareq@gmail.com', password: 'xGFeS6@*CVBN' },
  { name: 'Tasneem Hamideh', email: 'tasneemhamideh@gmail.com', password: 'BcSn^1yLNDjY' },
  { name: 'Toleen', email: 'toleen@gmail.com', password: '!28EsF0DaQdJ' },
  { name: 'Yahya Asim', email: 'mnellahi@hotmail.com', password: 'P&n*&G!N0Mm1' },
  { name: 'Yahya Dolani', email: 'aaqib.dolani@gmail.com', password: 'Fmka$a7!gw1D' },
  { name: 'Yahya Memon', email: 'yahyam@gmail.com', password: 'Fd@*w068SeH1' },
  { name: 'Yamin Almassri', email: 'hebaalbitar@hotmail.com', password: '9i!EuBf&UGlb' },
  { name: 'Yarah Saad', email: 'paligirl18@hotmail.com', password: '@XyJeP0t6R4#' },
  { name: 'Yusuf Rahman', email: 'aft.rahman@gmail.com', password: 'Xbl8EqbY6&$S' },
  { name: 'Zaina Khan', email: 'dreamscmtrue@gmail.com', password: 'BjlglK5%B2a2' },
  { name: 'Zuha Kashif', email: 'zuha@gmail.com', password: '87a#o!5IyXB$' }
];

async function verifyStudents() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    console.log(`📊 Connection URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    let foundInStudents = 0;
    let foundInUsers = 0;
    let hasPassword = 0;
    let passwordMatches = 0;
    let missingFromStudents = [];
    let missingFromUsers = [];
    let noPassword = [];
    let passwordMismatch = [];

    console.log(`📋 Verifying ${studentsFromCSV.length} students from CSV export...\n`);
    console.log('='.repeat(80));

    for (let i = 0; i < studentsFromCSV.length; i++) {
      const csvStudent = studentsFromCSV[i];
      const emailLower = csvStudent.email.toLowerCase();

      // Check in Students collection
      const student = await Student.findOne({ 
        email: { $regex: new RegExp(`^${emailLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });

      // Check in Users collection
      const user = await User.findOne({ 
        email: { $regex: new RegExp(`^${emailLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        role: 'student'
      });

      let status = '';
      
      if (student) {
        foundInStudents++;
        status += '✅ Student ';
      } else {
        status += '❌ No Student ';
        missingFromStudents.push(csvStudent);
      }

      if (user) {
        foundInUsers++;
        status += '✅ User ';
        
        if (user.password) {
          hasPassword++;
          // Try to verify password
          const isBcryptHash = user.password.startsWith('$2a$') || 
                              user.password.startsWith('$2b$') || 
                              user.password.startsWith('$2y$');
          
          if (isBcryptHash) {
            const passwordMatchesHash = await bcrypt.compare(csvStudent.password, user.password);
            if (passwordMatchesHash) {
              passwordMatches++;
              status += '✅ Password Match';
            } else {
              status += '❌ Password Mismatch';
              passwordMismatch.push({ ...csvStudent, userId: user._id });
            }
          } else {
            // Plain text password (legacy)
            if (user.password === csvStudent.password) {
              passwordMatches++;
              status += '✅ Password Match (plain)';
            } else {
              status += '❌ Password Mismatch (plain)';
              passwordMismatch.push({ ...csvStudent, userId: user._id });
            }
          }
        } else {
          status += '❌ No Password';
          noPassword.push({ ...csvStudent, userId: user._id });
        }
      } else {
        status += '❌ No User';
        missingFromUsers.push(csvStudent);
      }

      console.log(`${(i + 1).toString().padStart(3)}. ${csvStudent.name.padEnd(30)} ${status}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    console.log(`Total Students in CSV:     ${studentsFromCSV.length}`);
    console.log(`Found in Students table:   ${foundInStudents} (${((foundInStudents/studentsFromCSV.length)*100).toFixed(1)}%)`);
    console.log(`Found in Users table:      ${foundInUsers} (${((foundInUsers/studentsFromCSV.length)*100).toFixed(1)}%)`);
    console.log(`Have Password:             ${hasPassword} (${((hasPassword/studentsFromCSV.length)*100).toFixed(1)}%)`);
    console.log(`Password Matches:          ${passwordMatches} (${((passwordMatches/studentsFromCSV.length)*100).toFixed(1)}%)`);

    if (missingFromStudents.length > 0) {
      console.log(`\n❌ Missing from Students table (${missingFromStudents.length}):`);
      missingFromStudents.forEach(s => console.log(`   - ${s.name} (${s.email})`));
    }

    if (missingFromUsers.length > 0) {
      console.log(`\n❌ Missing from Users table (${missingFromUsers.length}):`);
      missingFromUsers.forEach(s => console.log(`   - ${s.name} (${s.email})`));
    }

    if (noPassword.length > 0) {
      console.log(`\n❌ No Password Set (${noPassword.length}):`);
      noPassword.forEach(s => console.log(`   - ${s.name} (${s.email})`));
    }

    if (passwordMismatch.length > 0) {
      console.log(`\n⚠️  Password Mismatch (${passwordMismatch.length}):`);
      passwordMismatch.forEach(s => console.log(`   - ${s.name} (${s.email})`));
    }

    await mongoose.disconnect();
    console.log('\n✅ Verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run verification
verifyStudents();

