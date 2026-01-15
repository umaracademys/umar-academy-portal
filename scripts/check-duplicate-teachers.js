#!/usr/bin/env node

/**
 * Check for Duplicate Teachers Script
 * 
 * This script checks for duplicate teachers in the database by:
 * 1. Finding duplicate teachers by normalized email
 * 2. Finding duplicate teachers by userId
 * 3. Reporting any duplicates found
 * 
 * Usage:
 *   node scripts/check-duplicate-teachers.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  teacherId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: String,
  contact: String,
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  role: String,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

async function checkDuplicateTeachers() {
  try {
    console.log('🔍 Checking for duplicate teachers...\n');
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get all teachers
    const allTeachers = await Teacher.find({}).lean();
    console.log(`📊 Total teachers in database: ${allTeachers.length}\n`);
    
    // Check for duplicates by email
    console.log('🔍 Checking for duplicates by email...');
    const emailGroups = {};
    for (const teacher of allTeachers) {
      const normalized = normalizeEmail(teacher.email);
      if (!normalized) continue;
      
      if (!emailGroups[normalized]) {
        emailGroups[normalized] = [];
      }
      emailGroups[normalized].push(teacher);
    }
    
    const duplicateEmails = Object.entries(emailGroups).filter(([_, teachers]) => teachers.length > 1);
    console.log(`   Found ${duplicateEmails.length} duplicate email groups\n`);
    
    if (duplicateEmails.length > 0) {
      console.log('⚠️  DUPLICATE TEACHERS BY EMAIL:');
      duplicateEmails.forEach(([email, teachers]) => {
        console.log(`\n   Email: ${email}`);
        teachers.forEach((teacher, index) => {
          console.log(`   ${index + 1}. Teacher ID: ${teacher._id}`);
          console.log(`      User ID: ${teacher.userId}`);
          console.log(`      Full Name: ${teacher.fullName}`);
          console.log(`      Created: ${teacher.createdAt || 'unknown'}`);
        });
      });
    }
    
    // Check for duplicates by userId
    console.log('\n🔍 Checking for duplicates by userId...');
    const userIdGroups = {};
    for (const teacher of allTeachers) {
      const userId = teacher.userId?.toString() || teacher.userId;
      if (!userId) continue;
      
      if (!userIdGroups[userId]) {
        userIdGroups[userId] = [];
      }
      userIdGroups[userId].push(teacher);
    }
    
    const duplicateUserIds = Object.entries(userIdGroups).filter(([_, teachers]) => teachers.length > 1);
    console.log(`   Found ${duplicateUserIds.length} duplicate userId groups\n`);
    
    if (duplicateUserIds.length > 0) {
      console.log('⚠️  DUPLICATE TEACHERS BY USER ID:');
      duplicateUserIds.forEach(([userId, teachers]) => {
        console.log(`\n   User ID: ${userId}`);
        teachers.forEach((teacher, index) => {
          console.log(`   ${index + 1}. Teacher ID: ${teacher._id}`);
          console.log(`      Email: ${teacher.email}`);
          console.log(`      Full Name: ${teacher.fullName}`);
          console.log(`      Created: ${teacher.createdAt || 'unknown'}`);
        });
      });
    }
    
    // Check for teachers with duplicate users
    console.log('\n🔍 Checking for teachers with duplicate users...');
    const teachersWithUsers = await Teacher.find({ userId: { $exists: true, $ne: null } })
      .populate('userId')
      .lean();
    
    const userEmailGroups = {};
    for (const teacher of teachersWithUsers) {
      const user = teacher.userId;
      if (!user || !user.email) continue;
      
      const normalized = normalizeEmail(user.email);
      if (!normalized) continue;
      
      if (!userEmailGroups[normalized]) {
        userEmailGroups[normalized] = [];
      }
      userEmailGroups[normalized].push(teacher);
    }
    
    const duplicateUserEmails = Object.entries(userEmailGroups).filter(([_, teachers]) => teachers.length > 1);
    console.log(`   Found ${duplicateUserEmails.length} teachers with duplicate user emails\n`);
    
    if (duplicateUserEmails.length > 0) {
      console.log('⚠️  TEACHERS WITH DUPLICATE USER EMAILS:');
      duplicateUserEmails.forEach(([email, teachers]) => {
        console.log(`\n   User Email: ${email}`);
        teachers.forEach((teacher, index) => {
          console.log(`   ${index + 1}. Teacher ID: ${teacher._id}`);
          console.log(`      Teacher Email: ${teacher.email}`);
          console.log(`      User ID: ${teacher.userId?._id || teacher.userId}`);
          console.log(`      Full Name: ${teacher.fullName}`);
        });
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total teachers: ${allTeachers.length}`);
    console.log(`Duplicate email groups: ${duplicateEmails.length}`);
    console.log(`Duplicate userId groups: ${duplicateUserIds.length}`);
    console.log(`Teachers with duplicate user emails: ${duplicateUserEmails.length}`);
    
    if (duplicateEmails.length === 0 && duplicateUserIds.length === 0 && duplicateUserEmails.length === 0) {
      console.log('\n✅ No duplicate teachers found in database!');
      console.log('   If duplicates appear in UI, check frontend deduplication logic.');
    } else {
      console.log('\n⚠️  Duplicate teachers found in database!');
      console.log('   Consider running cleanup-duplicate-users.js to fix duplicate users first.');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkDuplicateTeachers()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
