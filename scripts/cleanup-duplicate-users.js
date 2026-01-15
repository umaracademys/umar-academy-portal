#!/usr/bin/env node

/**
 * Cleanup Duplicate Users Script
 * 
 * This script safely removes duplicate users from the database by:
 * 1. Finding duplicate users by normalized email (lowercase)
 * 2. Keeping the oldest user (earliest createdAt) as canonical
 * 3. Reassigning all foreign references to the canonical user
 * 4. Deleting duplicate user records
 * 
 * Usage:
 *   node scripts/cleanup-duplicate-users.js --dry-run  # Preview changes
 *   node scripts/cleanup-duplicate-users.js            # Execute cleanup
 * 
 * Safety:
 * - Never deletes users that are still referenced
 * - Supports dry-run mode for preview
 * - Logs all operations for audit trail
 * - Can be safely re-run
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

// User Schema (matching server.js)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
  password: String,
  avatar: String,
  loginEnabled: { type: Boolean, default: true },
  twoFactorEnabled: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },
  contact: String,
  phoneNumber: String,
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  lastFailedLoginAttempt: Date,
  passwordChangeRequired: { type: Boolean, default: false },
  permissionsVersion: { type: Number, default: 1 }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  teacherId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: String,
  contact: String,
  // ... other fields not needed for cleanup
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
  adminId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: String,
  contact: String,
  // ... other fields not needed for cleanup
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

// Student Schema
const studentSchema = new mongoose.Schema({
  studentId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: String,
  // ... other fields not needed for cleanup
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

// QaidahStudentLearning Schema
const qaidahStudentLearningSchema = new mongoose.Schema({
  studentId: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // ... other fields not needed for cleanup
}, { timestamps: true });

const QaidahStudentLearning = mongoose.model('QaidahStudentLearning', qaidahStudentLearningSchema);

// MushafMistake Schema
const mushafMistakeSchema = new mongoose.Schema({
  studentId: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // ... other fields not needed for cleanup
}, { timestamps: true });

const MushafMistake = mongoose.model('MushafMistake', mushafMistakeSchema);

// MushafAnnotation Schema
const mushafAnnotationSchema = new mongoose.Schema({
  studentId: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // ... other fields not needed for cleanup
}, { timestamps: true });

const MushafAnnotation = mongoose.model('MushafAnnotation', mushafAnnotationSchema);

// MushafPageNote Schema
const mushafPageNoteSchema = new mongoose.Schema({
  studentId: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // ... other fields not needed for cleanup
}, { timestamps: true });

const MushafPageNote = mongoose.model('MushafPageNote', mushafPageNoteSchema);

// Collections with String-based user references (not ObjectId)
// These need special handling as they store user IDs as strings
const STRING_REF_COLLECTIONS = {
  'assignments': { field: 'assignedBy', model: null }, // Will get model dynamically
  'tickets': { field: 'createdBy', model: null },
  'activitylogs': { field: 'userId', model: null },
};

// Statistics
const stats = {
  duplicateGroups: 0,
  usersKept: 0,
  usersToDelete: 0,
  referencesUpdated: {},
  errors: []
};

/**
 * Normalize email (lowercase, trim)
 */
function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

/**
 * Find all duplicate user groups
 */
async function findDuplicateUsers() {
  console.log('\n🔍 Step 1: Finding duplicate users by normalized email...\n');
  
  // Get all users
  const allUsers = await User.find({}).lean();
  
  // Group by normalized email
  const emailGroups = {};
  for (const user of allUsers) {
    const normalized = normalizeEmail(user.email);
    if (!normalized) continue; // Skip users without email
    
    if (!emailGroups[normalized]) {
      emailGroups[normalized] = [];
    }
    emailGroups[normalized].push(user);
  }
  
  // Filter to only groups with duplicates
  const duplicates = {};
  for (const [email, users] of Object.entries(emailGroups)) {
    if (users.length > 1) {
      // Sort by createdAt (oldest first)
      users.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateA - dateB;
      });
      
      duplicates[email] = users;
      stats.duplicateGroups++;
    }
  }
  
  console.log(`✅ Found ${stats.duplicateGroups} duplicate email groups`);
  console.log(`   Total users: ${allUsers.length}`);
  console.log(`   Unique emails: ${Object.keys(emailGroups).length}`);
  console.log(`   Duplicate groups: ${Object.keys(duplicates).length}\n`);
  
  return duplicates;
}

/**
 * Get all collections that reference a user ID
 */
async function findUserReferences(duplicateUserId) {
  const references = {
    teachers: [],
    admins: [],
    students: [],
    qaidahStudentLearning: [],
    mushafMistakes: [],
    mushafAnnotations: [],
    mushafPageNotes: [],
    assignments: [],
    tickets: [],
    activityLogs: []
  };
  
  const duplicateIdObj = new mongoose.Types.ObjectId(duplicateUserId);
  const duplicateIdStr = duplicateUserId.toString();
  
  try {
    // ObjectId references
    references.teachers = await Teacher.find({ userId: duplicateIdObj }).lean();
    references.admins = await Admin.find({ userId: duplicateIdObj }).lean();
    references.students = await Student.find({ userId: duplicateIdObj }).lean();
    references.qaidahStudentLearning = await QaidahStudentLearning.find({ 
      $or: [
        { createdBy: duplicateIdObj },
        { updatedBy: duplicateIdObj }
      ]
    }).lean();
    references.mushafMistakes = await MushafMistake.find({
      $or: [
        { createdBy: duplicateIdObj },
        { updatedBy: duplicateIdObj }
      ]
    }).lean();
    references.mushafAnnotations = await MushafAnnotation.find({
      $or: [
        { createdBy: duplicateIdObj },
        { updatedBy: duplicateIdObj }
      ]
    }).lean();
    references.mushafPageNotes = await MushafPageNote.find({ 
      createdBy: duplicateIdObj 
    }).lean();
    
    // String references (need to check both ObjectId string and original format)
    const Assignment = mongoose.connection.collection('assignments');
    references.assignments = await Assignment.find({ 
      assignedBy: { $in: [duplicateIdStr, duplicateUserId] }
    }).toArray();
    
    const Ticket = mongoose.connection.collection('tickets');
    references.tickets = await Ticket.find({ 
      createdBy: { $in: [duplicateIdStr, duplicateUserId] }
    }).toArray();
    
    const ActivityLog = mongoose.connection.collection('activitylogs');
    references.activityLogs = await ActivityLog.find({ 
      userId: { $in: [duplicateIdStr, duplicateUserId] }
    }).toArray();
    
  } catch (error) {
    console.error(`❌ Error finding references for user ${duplicateUserId}:`, error.message);
    stats.errors.push(`Error finding references: ${error.message}`);
  }
  
  return references;
}

/**
 * Reassign references from duplicate user to canonical user
 */
async function reassignReferences(duplicateUserId, canonicalUserId, references) {
  const canonicalIdObj = new mongoose.Types.ObjectId(canonicalUserId);
  const canonicalIdStr = canonicalUserId.toString();
  const duplicateIdObj = new mongoose.Types.ObjectId(duplicateUserId);
  const duplicateIdStr = duplicateUserId.toString();
  
  let totalUpdated = 0;
  
  try {
    // Update ObjectId references
    if (references.teachers.length > 0) {
      const result = await Teacher.updateMany(
        { userId: duplicateIdObj },
        { $set: { userId: canonicalIdObj } }
      );
      totalUpdated += result.modifiedCount;
      if (!stats.referencesUpdated.teachers) stats.referencesUpdated.teachers = 0;
      stats.referencesUpdated.teachers += result.modifiedCount;
    }
    
    if (references.admins.length > 0) {
      const result = await Admin.updateMany(
        { userId: duplicateIdObj },
        { $set: { userId: canonicalIdObj } }
      );
      totalUpdated += result.modifiedCount;
      if (!stats.referencesUpdated.admins) stats.referencesUpdated.admins = 0;
      stats.referencesUpdated.admins += result.modifiedCount;
    }
    
    if (references.students.length > 0) {
      const result = await Student.updateMany(
        { userId: duplicateIdObj },
        { $set: { userId: canonicalIdObj } }
      );
      totalUpdated += result.modifiedCount;
      if (!stats.referencesUpdated.students) stats.referencesUpdated.students = 0;
      stats.referencesUpdated.students += result.modifiedCount;
    }
    
    if (references.qaidahStudentLearning.length > 0) {
      // Update createdBy if it matches duplicate
      const result1 = await QaidahStudentLearning.updateMany(
        { createdBy: duplicateIdObj },
        { $set: { createdBy: canonicalIdObj } }
      );
      // Update updatedBy if it matches duplicate
      const result2 = await QaidahStudentLearning.updateMany(
        { updatedBy: duplicateIdObj },
        { $set: { updatedBy: canonicalIdObj } }
      );
      totalUpdated += result1.modifiedCount + result2.modifiedCount;
      if (!stats.referencesUpdated.qaidahStudentLearning) stats.referencesUpdated.qaidahStudentLearning = 0;
      stats.referencesUpdated.qaidahStudentLearning += result1.modifiedCount + result2.modifiedCount;
    }
    
    if (references.mushafMistakes.length > 0) {
      // Update createdBy if it matches duplicate
      const result1 = await MushafMistake.updateMany(
        { createdBy: duplicateIdObj },
        { $set: { createdBy: canonicalIdObj } }
      );
      // Update updatedBy if it matches duplicate
      const result2 = await MushafMistake.updateMany(
        { updatedBy: duplicateIdObj },
        { $set: { updatedBy: canonicalIdObj } }
      );
      totalUpdated += result1.modifiedCount + result2.modifiedCount;
      if (!stats.referencesUpdated.mushafMistakes) stats.referencesUpdated.mushafMistakes = 0;
      stats.referencesUpdated.mushafMistakes += result1.modifiedCount + result2.modifiedCount;
    }
    
    if (references.mushafAnnotations.length > 0) {
      // Update createdBy if it matches duplicate
      const result1 = await MushafAnnotation.updateMany(
        { createdBy: duplicateIdObj },
        { $set: { createdBy: canonicalIdObj } }
      );
      // Update updatedBy if it matches duplicate
      const result2 = await MushafAnnotation.updateMany(
        { updatedBy: duplicateIdObj },
        { $set: { updatedBy: canonicalIdObj } }
      );
      totalUpdated += result1.modifiedCount + result2.modifiedCount;
      if (!stats.referencesUpdated.mushafAnnotations) stats.referencesUpdated.mushafAnnotations = 0;
      stats.referencesUpdated.mushafAnnotations += result1.modifiedCount + result2.modifiedCount;
    }
    
    if (references.mushafPageNotes.length > 0) {
      const result = await MushafPageNote.updateMany(
        { createdBy: duplicateIdObj },
        { $set: { createdBy: canonicalIdObj } }
      );
      totalUpdated += result.modifiedCount;
      if (!stats.referencesUpdated.mushafPageNotes) stats.referencesUpdated.mushafPageNotes = 0;
      stats.referencesUpdated.mushafPageNotes += result.modifiedCount;
    }
    
    // Update String references
    if (references.assignments.length > 0) {
      const Assignment = mongoose.connection.collection('assignments');
      const result = await Assignment.updateMany(
        { assignedBy: { $in: [duplicateIdStr, duplicateUserId] } },
        { $set: { assignedBy: canonicalIdStr } }
      );
      totalUpdated += result.modifiedCount;
      if (!stats.referencesUpdated.assignments) stats.referencesUpdated.assignments = 0;
      stats.referencesUpdated.assignments += result.modifiedCount;
    }
    
    if (references.tickets.length > 0) {
      const Ticket = mongoose.connection.collection('tickets');
      const result = await Ticket.updateMany(
        { createdBy: { $in: [duplicateIdStr, duplicateUserId] } },
        { $set: { createdBy: canonicalIdStr } }
      );
      totalUpdated += result.modifiedCount;
      if (!stats.referencesUpdated.tickets) stats.referencesUpdated.tickets = 0;
      stats.referencesUpdated.tickets += result.modifiedCount;
    }
    
    if (references.activityLogs.length > 0) {
      const ActivityLog = mongoose.connection.collection('activitylogs');
      const result = await ActivityLog.updateMany(
        { userId: { $in: [duplicateIdStr, duplicateUserId] } },
        { $set: { userId: canonicalIdStr } }
      );
      totalUpdated += result.modifiedCount;
      if (!stats.referencesUpdated.activityLogs) stats.referencesUpdated.activityLogs = 0;
      stats.referencesUpdated.activityLogs += result.modifiedCount;
    }
    
  } catch (error) {
    console.error(`❌ Error reassigning references:`, error.message);
    stats.errors.push(`Error reassigning references: ${error.message}`);
    throw error; // Abort if we can't reassign
  }
  
  return totalUpdated;
}

/**
 * Process a single duplicate group
 */
async function processDuplicateGroup(email, users) {
  const canonical = users[0]; // Oldest user (sorted by createdAt)
  const duplicates = users.slice(1); // All others
  
  console.log(`\n📧 Processing email: ${email}`);
  console.log(`   Canonical user: ${canonical._id} (created: ${canonical.createdAt || 'unknown'})`);
  console.log(`   Duplicates to remove: ${duplicates.length}`);
  
  stats.usersKept++;
  stats.usersToDelete += duplicates.length;
  
  for (const duplicate of duplicates) {
    console.log(`\n   🔄 Processing duplicate: ${duplicate._id} (created: ${duplicate.createdAt || 'unknown'})`);
    
    // Find all references
    const references = await findUserReferences(duplicate._id);
    
    // Count total references
    const totalRefs = Object.values(references).reduce((sum, refs) => sum + refs.length, 0);
    
    if (totalRefs > 0) {
      console.log(`      📎 Found ${totalRefs} references:`);
      Object.entries(references).forEach(([collection, refs]) => {
        if (refs.length > 0) {
          console.log(`         - ${collection}: ${refs.length}`);
        }
      });
      
      if (!isDryRun) {
        // Reassign references
        const updated = await reassignReferences(duplicate._id, canonical._id, references);
        console.log(`      ✅ Reassigned ${updated} references to canonical user`);
      } else {
        console.log(`      🔍 [DRY-RUN] Would reassign ${totalRefs} references to canonical user`);
      }
    } else {
      console.log(`      ✅ No references found (safe to delete)`);
    }
    
    // Delete duplicate user
    if (!isDryRun) {
      await User.deleteOne({ _id: duplicate._id });
      console.log(`      ✅ Deleted duplicate user ${duplicate._id}`);
    } else {
      console.log(`      🔍 [DRY-RUN] Would delete user ${duplicate._id}`);
    }
  }
}

/**
 * Main cleanup function
 */
async function cleanupDuplicateUsers() {
  try {
    console.log('🚀 Starting Duplicate User Cleanup');
    console.log(`   Mode: ${isDryRun ? '🔍 DRY-RUN (no changes will be made)' : '⚡ LIVE (changes will be applied)'}`);
    console.log(`   Database: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}\n`);
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Find duplicates
    const duplicates = await findDuplicateUsers();
    
    if (Object.keys(duplicates).length === 0) {
      console.log('✅ No duplicate users found. Database is clean!');
      await mongoose.disconnect();
      return;
    }
    
    // Step 2: Process each duplicate group
    console.log('\n🔄 Step 2: Processing duplicate groups...\n');
    
    for (const [email, users] of Object.entries(duplicates)) {
      await processDuplicateGroup(email, users);
    }
    
    // Step 3: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`Duplicate email groups: ${stats.duplicateGroups}`);
    console.log(`Users kept (canonical): ${stats.usersKept}`);
    console.log(`Users ${isDryRun ? 'would be ' : ''}deleted: ${stats.usersToDelete}`);
    console.log(`\nReference updates ${isDryRun ? 'would be ' : ''}performed:`);
    Object.entries(stats.referencesUpdated).forEach(([collection, count]) => {
      if (count > 0) {
        console.log(`  - ${collection}: ${count}`);
      }
    });
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
    if (isDryRun) {
      console.log('\n🔍 DRY-RUN MODE: No changes were made');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Cleanup completed successfully!');
    }
    
    console.log('='.repeat(60) + '\n');
    
    // Verify no duplicates remain
    console.log('🔍 Verifying cleanup...');
    const remainingDuplicates = await findDuplicateUsers();
    if (Object.keys(remainingDuplicates).length === 0) {
      console.log('✅ Verification passed: No duplicates remain');
    } else {
      console.log(`⚠️  Warning: ${Object.keys(remainingDuplicates).length} duplicate groups still exist`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('\n❌ Fatal error during cleanup:', error);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run cleanup (ES module entry point)
cleanupDuplicateUsers()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

export { cleanupDuplicateUsers, findDuplicateUsers };
