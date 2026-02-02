// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// Weekly Evaluation Schema (matching server.js)
const weeklyEvaluationSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  weekStartDate: { type: Date, required: true },
  weekEndDate: { type: Date, required: true },
  level: { type: String, enum: ['Qaidah 1', 'Qaidah 2', 'Reading'], required: true },
  selectedSurah: String,
  strengths: String,
  weaknesses: String,
  commonMistakes: String,
  etiquetteNotes: String,
  teacherNotes: String,
  status: { type: String, enum: ['draft', 'submitted', 'approved', 'rejected'], default: 'draft' },
  ratings: {
    fluency: Number,
    tajweed: Number,
    accuracy: Number,
    memorization: Number,
    engagement: Number,
    behavior: Number
  }
}, { timestamps: true, strict: false });

const WeeklyEvaluation = mongoose.model('WeeklyEvaluation', weeklyEvaluationSchema);

async function checkEvaluation() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB`);
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}:${mongoose.connection.port}\n`);

    const studentName = 'Zaina Khan';
    const weekStartDate = new Date('2025-12-28T00:00:00.000Z'); // December 28, 2025
    const weekEndDate = new Date('2026-01-03T23:59:59.999Z'); // January 3, 2026

    console.log(`📋 Searching for evaluation:`);
    console.log(`   Student: ${studentName}`);
    console.log(`   Week: December 28, 2025 - January 3, 2026\n`);

    // First, search for approved evaluations with this student name (like the dashboard does)
    console.log('🔍 Searching for APPROVED evaluations with admin feedback...\n');
    const approvedEvaluations = await WeeklyEvaluation.find({
      studentName: { $regex: new RegExp(studentName, 'i') },
      status: { $in: ['approved', 'feedback_provided'] }
    }).sort({ approvedAt: -1, reviewedAt: -1 });

    // Also search by student name and week dates (any status)
    const evaluations = await WeeklyEvaluation.find({
      studentName: { $regex: new RegExp(studentName, 'i') },
      weekStartDate: { $gte: weekStartDate, $lte: weekEndDate }
    }).sort({ createdAt: -1 });

    // Show approved evaluations first
    if (approvedEvaluations.length > 0) {
      console.log(`✅ Found ${approvedEvaluations.length} APPROVED evaluation(s) for "${studentName}":\n`);
      
      approvedEvaluations.forEach((eval, index) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`APPROVED Evaluation ${index + 1}:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`ID: ${eval.id}`);
        console.log(`Student: ${eval.studentName}`);
        console.log(`Student ID: ${eval.studentId}`);
        console.log(`Teacher: ${eval.teacherName} (ID: ${eval.teacherId})`);
        console.log(`Week Start: ${new Date(eval.weekStartDate).toLocaleDateString()}`);
        console.log(`Week End: ${new Date(eval.weekEndDate).toLocaleDateString()}`);
        console.log(`Level: ${eval.level}`);
        if (eval.selectedSurah) {
          console.log(`Surah: ${eval.selectedSurah}`);
        }
        console.log(`Status: ${eval.status}`);
        if (eval.approvedAt) {
          console.log(`Approved At: ${new Date(eval.approvedAt).toLocaleString()}`);
        }
        
        if (eval.ratings) {
          console.log(`\nRatings:`);
          console.log(`  Fluency: ${eval.ratings.fluency || 'N/A'}`);
          console.log(`  Tajweed: ${eval.ratings.tajweed || 'N/A'}`);
          console.log(`  Accuracy: ${eval.ratings.accuracy || 'N/A'}`);
          if (eval.ratings.memorization) {
            console.log(`  Memorization: ${eval.ratings.memorization}`);
          }
          console.log(`  Engagement: ${eval.ratings.engagement || 'N/A'}`);
          console.log(`  Behavior: ${eval.ratings.behavior || 'N/A'}`);
        }
        
        if (eval.strengths) {
          console.log(`\nStrengths: ${eval.strengths.substring(0, 200)}${eval.strengths.length > 200 ? '...' : ''}`);
        }
        if (eval.weaknesses) {
          console.log(`Weaknesses: ${eval.weaknesses.substring(0, 200)}${eval.weaknesses.length > 200 ? '...' : ''}`);
        }
        if (eval.commonMistakes) {
          console.log(`Common Mistakes: ${eval.commonMistakes.substring(0, 200)}${eval.commonMistakes.length > 200 ? '...' : ''}`);
        }
        
        // Show admin feedback if exists
        if (eval.adminFeedback) {
          console.log(`\n📝 ADMIN FEEDBACK:`);
          console.log(`${eval.adminFeedback}`);
        } else {
          console.log(`\n📝 ADMIN FEEDBACK: Not provided`);
        }
        if (eval.gamePlan) {
          console.log(`\n📋 GAME PLAN:`);
          console.log(`${eval.gamePlan}`);
        } else {
          console.log(`\n📋 GAME PLAN: Not provided`);
        }
        if (eval.sharedLinks && eval.sharedLinks.length > 0) {
          console.log(`\n🔗 SHARED LINKS:`);
          eval.sharedLinks.forEach((link, idx) => {
            console.log(`   ${idx + 1}. ${link}`);
          });
        } else {
          console.log(`\n🔗 SHARED LINKS: None`);
        }
        if (eval.reviewedBy) {
          console.log(`\nReviewed By: ${eval.reviewedByName || eval.reviewedBy}`);
        }
        if (eval.reviewedAt) {
          console.log(`Reviewed At: ${new Date(eval.reviewedAt).toLocaleString()}`);
        }
        
        console.log(`\nCreated: ${eval.createdAt ? new Date(eval.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`Updated: ${eval.updatedAt ? new Date(eval.updatedAt).toLocaleString() : 'N/A'}`);
        if (eval.submittedAt) {
          console.log(`Submitted: ${new Date(eval.submittedAt).toLocaleString()}`);
        }
        
        // Show admin feedback if exists
        if (eval.adminFeedback) {
          console.log(`\n📝 ADMIN FEEDBACK:`);
          console.log(`${eval.adminFeedback}`);
        } else {
          console.log(`\n📝 ADMIN FEEDBACK: Not provided`);
        }
        if (eval.gamePlan) {
          console.log(`\n📋 GAME PLAN:`);
          console.log(`${eval.gamePlan}`);
        } else {
          console.log(`\n📋 GAME PLAN: Not provided`);
        }
        if (eval.sharedLinks && eval.sharedLinks.length > 0) {
          console.log(`\n🔗 SHARED LINKS:`);
          eval.sharedLinks.forEach((link, idx) => {
            console.log(`   ${idx + 1}. ${link}`);
          });
        } else {
          console.log(`\n🔗 SHARED LINKS: None`);
        }
        if (eval.reviewedBy) {
          console.log(`\nReviewed By: ${eval.reviewedByName || eval.reviewedBy}`);
        }
        if (eval.reviewedAt) {
          console.log(`Reviewed At: ${new Date(eval.reviewedAt).toLocaleString()}`);
        }
        
        // Show full document for debugging
        console.log(`\n📄 Full Document Keys:`, Object.keys(eval.toObject ? eval.toObject() : eval).join(', '));
        
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      });
    }

    if (evaluations.length === 0) {
      console.log('❌ No evaluation found for this student and week.\n');
      
      // Also check if student exists with similar name
      const allEvaluations = await WeeklyEvaluation.find({
        studentName: { $regex: new RegExp('Zaina', 'i') }
      }).sort({ weekStartDate: -1 }).limit(10);
      
      if (allEvaluations.length > 0) {
        console.log(`📝 Found ${allEvaluations.length} evaluation(s) for students with "Zaina" in name:`);
        allEvaluations.forEach((eval, index) => {
          console.log(`\n   ${index + 1}. Student: ${eval.studentName}`);
          console.log(`      Week: ${new Date(eval.weekStartDate).toLocaleDateString()} - ${new Date(eval.weekEndDate).toLocaleDateString()}`);
          console.log(`      Status: ${eval.status}`);
          console.log(`      ID: ${eval.id}`);
        });
      } else {
        console.log('❌ No evaluations found for any student with "Zaina" in name.');
      }
      
      // Check for evaluations around that date range (any student)
      console.log('\n🔍 Checking for any evaluations in that week range...');
      const weekEvaluations = await WeeklyEvaluation.find({
        weekStartDate: { $gte: weekStartDate, $lte: weekEndDate }
      }).sort({ studentName: 1 }).limit(20);
      
      if (weekEvaluations.length > 0) {
        console.log(`\n📝 Found ${weekEvaluations.length} evaluation(s) for that week (any student):`);
        weekEvaluations.forEach((eval, index) => {
          console.log(`\n   ${index + 1}. Student: ${eval.studentName}`);
          console.log(`      Week: ${new Date(eval.weekStartDate).toLocaleDateString()} - ${new Date(eval.weekEndDate).toLocaleDateString()}`);
          console.log(`      Status: ${eval.status}`);
          console.log(`      ID: ${eval.id}`);
        });
      } else {
        console.log('❌ No evaluations found for that week range.');
      }
      
      // Check total count of evaluations
      const totalCount = await WeeklyEvaluation.countDocuments({});
      console.log(`\n📊 Total evaluations in database: ${totalCount}`);
      
      if (totalCount > 0) {
        console.log('\n📝 Sample of recent evaluations:');
        const recentEvals = await WeeklyEvaluation.find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .select('studentName weekStartDate weekEndDate status id');
        recentEvals.forEach((eval, index) => {
          console.log(`   ${index + 1}. ${eval.studentName} - Week of ${new Date(eval.weekStartDate).toLocaleDateString()} (${eval.status})`);
        });
      }
    } else {
      console.log(`✅ Found ${evaluations.length} evaluation(s):\n`);
      
      evaluations.forEach((eval, index) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Evaluation ${index + 1}:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`ID: ${eval.id}`);
        console.log(`Student: ${eval.studentName}`);
        console.log(`Student ID: ${eval.studentId}`);
        console.log(`Teacher: ${eval.teacherName} (ID: ${eval.teacherId})`);
        console.log(`Week Start: ${new Date(eval.weekStartDate).toLocaleDateString()}`);
        console.log(`Week End: ${new Date(eval.weekEndDate).toLocaleDateString()}`);
        console.log(`Level: ${eval.level}`);
        if (eval.selectedSurah) {
          console.log(`Surah: ${eval.selectedSurah}`);
        }
        console.log(`Status: ${eval.status}`);
        
        if (eval.ratings) {
          console.log(`\nRatings:`);
          console.log(`  Fluency: ${eval.ratings.fluency || 'N/A'}`);
          console.log(`  Tajweed: ${eval.ratings.tajweed || 'N/A'}`);
          console.log(`  Accuracy: ${eval.ratings.accuracy || 'N/A'}`);
          if (eval.ratings.memorization) {
            console.log(`  Memorization: ${eval.ratings.memorization}`);
          }
          console.log(`  Engagement: ${eval.ratings.engagement || 'N/A'}`);
          console.log(`  Behavior: ${eval.ratings.behavior || 'N/A'}`);
        }
        
        if (eval.strengths) {
          console.log(`\nStrengths: ${eval.strengths.substring(0, 100)}${eval.strengths.length > 100 ? '...' : ''}`);
        }
        if (eval.weaknesses) {
          console.log(`Weaknesses: ${eval.weaknesses.substring(0, 100)}${eval.weaknesses.length > 100 ? '...' : ''}`);
        }
        if (eval.commonMistakes) {
          console.log(`Common Mistakes: ${eval.commonMistakes.substring(0, 100)}${eval.commonMistakes.length > 100 ? '...' : ''}`);
        }
        
        console.log(`\nCreated: ${eval.createdAt ? new Date(eval.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`Updated: ${eval.updatedAt ? new Date(eval.updatedAt).toLocaleString() : 'N/A'}`);
        if (eval.submittedAt) {
          console.log(`Submitted: ${new Date(eval.submittedAt).toLocaleString()}`);
        }
        if (eval.approvedAt) {
          console.log(`Approved: ${new Date(eval.approvedAt).toLocaleString()}`);
        }
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      });
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkEvaluation();

