/**
 * Script to check assignments in MongoDB
 * 
 * Usage: node backend/checkAssignments.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

// Assignment schema (simplified for querying)
const assignmentSchema = new mongoose.Schema({}, { strict: false });
const Assignment = mongoose.model('Assignment', assignmentSchema);

async function checkAssignments() {
  try {
    console.log('🔍 Checking assignments in MongoDB...');
    console.log(`📊 Connection URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);
    
    // Connect
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB!\n');
    
    // Count total assignments
    const totalCount = await Assignment.countDocuments();
    console.log(`📝 Total assignments: ${totalCount}\n`);
    
    if (totalCount === 0) {
      console.log('⚠️  No assignments found in database!');
      await mongoose.disconnect();
      return;
    }
    
    // Get sample assignments
    const sampleAssignments = await Assignment.find({}).limit(5).lean();
    
    console.log('📋 Sample assignments:');
    console.log('='.repeat(60));
    
    sampleAssignments.forEach((assignment, index) => {
      console.log(`\n${index + 1}. Assignment ID: ${assignment._id}`);
      console.log(`   Student ID: ${assignment.studentId} (type: ${typeof assignment.studentId})`);
      console.log(`   Status: ${assignment.status || 'N/A'}`);
      console.log(`   Created: ${assignment.createdAt ? new Date(assignment.createdAt).toLocaleString() : 'N/A'}`);
      console.log(`   Classwork:`);
      console.log(`     - Sabq: ${assignment.classwork?.sabq?.length || 0} items`);
      console.log(`     - Sabqi: ${assignment.classwork?.sabqi?.length || 0} items`);
      console.log(`     - Manzil: ${assignment.classwork?.manzil?.length || 0} items`);
      console.log(`   Homework: ${assignment.homework?.enabled ? 'Enabled' : 'Disabled'}`);
      if (assignment.homework?.items) {
        console.log(`     - Items: ${assignment.homework.items.length}`);
      }
    });
    
    // Check unique studentIds
    const uniqueStudentIds = await Assignment.distinct('studentId');
    console.log(`\n👥 Unique student IDs with assignments: ${uniqueStudentIds.length}`);
    if (uniqueStudentIds.length > 0 && uniqueStudentIds.length <= 10) {
      console.log('   Student IDs:', uniqueStudentIds.map(id => String(id)).join(', '));
    } else if (uniqueStudentIds.length > 10) {
      console.log('   First 10 Student IDs:', uniqueStudentIds.slice(0, 10).map(id => String(id)).join(', '));
    }
    
    // Check for assignments with null/undefined studentId
    const assignmentsWithoutStudentId = await Assignment.countDocuments({
      $or: [
        { studentId: null },
        { studentId: { $exists: false } },
        { studentId: '' }
      ]
    });
    if (assignmentsWithoutStudentId > 0) {
      console.log(`\n⚠️  Found ${assignmentsWithoutStudentId} assignments without studentId!`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

checkAssignments();

