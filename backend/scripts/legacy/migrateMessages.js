// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


/**
 * Migration Script: Migrate existing messages to unified schema
 * 
 * This script migrates existing TeacherStudentMessage and PairTeacherMessage
 * documents to the new unified Conversation and Message schema.
 * 
 * Usage: node backend/scripts/migrateMessages.js
 * 
 * @module scripts/migrateMessages
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// Load existing models
require('../../server'); // This loads all schemas

// LEGACY import: required only for historical/manual scripts, not active app logic
const Conversation = require('../../models/legacy/Conversation');
const Message = require('../../models/legacy/Message');

async function migrateMessages() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User');
    const Teacher = mongoose.model('Teacher');
    const Student = mongoose.model('Student');
    const TeacherPair = mongoose.model('TeacherPair');
    const TeacherStudentMessage = mongoose.model('TeacherStudentMessage');
    const PairTeacherMessage = mongoose.model('PairTeacherMessage');

    // Find admin user
    const admin = await User.findOne({ role: 'superadmin' }) || await User.findOne({ role: 'admin' });
    if (!admin) {
      throw new Error('Admin user not found. Cannot migrate without admin.');
    }
    console.log(`✅ Found admin: ${admin.email}\n`);

    let migratedConversations = 0;
    let migratedMessages = 0;
    let errors = 0;

    // Migrate Teacher-Student Messages
    console.log('📋 Migrating Teacher-Student Messages...');
    const teacherStudentMessages = await TeacherStudentMessage.find({}).sort({ createdAt: 1 });
    console.log(`   Found ${teacherStudentMessages.length} messages to migrate`);

    const teacherStudentConversations = new Map();

    for (const msg of teacherStudentMessages) {
      try {
        // Determine participants
        const participants = [];
        
        if (msg.fromTeacher) {
          const teacher = await Teacher.findById(msg.fromTeacher);
          if (teacher) {
            participants.push({
              role: 'teacher',
              userId: teacher._id,
              roleRef: 'Teacher',
              name: teacher.fullName || '',
              email: teacher.email || ''
            });
          }
        }
        
        if (msg.toTeacher) {
          const teacher = await Teacher.findById(msg.toTeacher);
          if (teacher && !participants.find(p => p.userId.toString() === teacher._id.toString())) {
            participants.push({
              role: 'teacher',
              userId: teacher._id,
              roleRef: 'Teacher',
              name: teacher.fullName || '',
              email: teacher.email || ''
            });
          }
        }
        
        if (msg.fromStudent) {
          const student = await Student.findById(msg.fromStudent);
          if (student) {
            participants.push({
              role: 'student',
              userId: student._id,
              roleRef: 'Student',
              name: student.fullName || '',
              email: student.email || ''
            });
          }
        }
        
        if (msg.toStudent) {
          const student = await Student.findById(msg.toStudent);
          if (student && !participants.find(p => p.userId.toString() === student._id.toString())) {
            participants.push({
              role: 'student',
              userId: student._id,
              roleRef: 'Student',
              name: student.fullName || '',
              email: student.email || ''
            });
          }
        }

        // Add admin
        participants.push({
          role: 'admin',
          userId: admin._id,
          roleRef: 'User',
          name: admin.name || 'Super Admin',
          email: admin.email || ''
        });

        // Create conversation key
        const studentId = msg.fromStudent || msg.toStudent;
        const conversationKey = `teacher_student_${studentId}`;

        // Get or create conversation
        let conversation = teacherStudentConversations.get(conversationKey);
        
        if (!conversation) {
          conversation = await Conversation.findOrCreate(
            'teacher_student',
            participants.filter(p => p.role !== 'admin'), // Admin will be added automatically
            {
              studentId: studentId || null,
              teacherId: msg.fromTeacher || msg.toTeacher || null
            }
          );
          teacherStudentConversations.set(conversationKey, conversation);
          migratedConversations++;
        }

        // Determine sender
        let senderRole = 'admin';
        let senderId = admin._id;
        let senderRoleRef = 'User';
        let senderName = 'Administration';

        if (msg.fromTeacher) {
          senderRole = 'teacher';
          senderId = msg.fromTeacher;
          senderRoleRef = 'Teacher';
          const teacher = await Teacher.findById(msg.fromTeacher);
          senderName = teacher?.fullName || 'Teacher';
        } else if (msg.fromStudent) {
          senderRole = 'student';
          senderId = msg.fromStudent;
          senderRoleRef = 'Student';
          const student = await Student.findById(msg.fromStudent);
          senderName = student?.fullName || 'Student';
        }

        // Create message
        const newMessage = new Message({
          conversationId: conversation._id,
          senderRole,
          senderId,
          senderRoleRef,
          senderName,
          body: msg.message || '',
          attachments: (msg.attachments || []).map(att => ({
            filename: att.filename || '',
            url: att.url || '',
            mimetype: att.mimetype || 'application/octet-stream',
            size: att.size || 0
          })),
          readBy: msg.read ? [{
            role: msg.toTeacher ? 'teacher' : 'student',
            userId: msg.toTeacher || msg.toStudent,
            readAt: msg.readAt || new Date()
          }] : [],
          priority: 'normal',
          system: msg.adminInitiated || false,
          createdAt: msg.createdAt || new Date()
        });

        await newMessage.save();
        migratedMessages++;

        // Update conversation
        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessageAt: msg.createdAt || new Date(),
          lastMessageId: newMessage._id,
          $inc: { messageCount: 1 }
        });

      } catch (error) {
        console.error(`❌ Error migrating message ${msg._id}:`, error.message);
        errors++;
      }
    }

    // Migrate Pair Teacher Messages
    console.log('\n📋 Migrating Pair Teacher Messages...');
    const pairTeacherMessages = await PairTeacherMessage.find({}).sort({ createdAt: 1 });
    console.log(`   Found ${pairTeacherMessages.length} messages to migrate`);

    const pairTeacherConversations = new Map();

    for (const msg of pairTeacherMessages) {
      try {
        const pair = await TeacherPair.findById(msg.pair);
        if (!pair) {
          console.warn(`⚠️  Pair ${msg.pair} not found, skipping message ${msg._id}`);
          continue;
        }

        // Get teachers
        const teacher1 = await Teacher.findById(pair.teacher1);
        const teacher2 = await Teacher.findById(pair.teacher2);

        if (!teacher1 || !teacher2) {
          console.warn(`⚠️  Teachers not found for pair ${pair._id}, skipping`);
          continue;
        }

        const participants = [
          {
            role: 'teacher',
            userId: teacher1._id,
            roleRef: 'Teacher',
            name: teacher1.fullName || '',
            email: teacher1.email || ''
          },
          {
            role: 'teacher',
            userId: teacher2._id,
            roleRef: 'Teacher',
            name: teacher2.fullName || '',
            email: teacher2.email || ''
          }
        ];

        // Add admin
        participants.push({
          role: 'admin',
          userId: admin._id,
          roleRef: 'User',
          name: admin.name || 'Super Admin',
          email: admin.email || ''
        });

        // Create conversation key
        const conversationKey = `pair_teacher_${pair._id}`;

        // Get or create conversation
        let conversation = pairTeacherConversations.get(conversationKey);
        
        if (!conversation) {
          conversation = await Conversation.findOrCreate(
            'pair_teacher',
            participants.filter(p => p.role !== 'admin'),
            {
              pairId: pair._id,
              teacherId: msg.fromTeacher
            }
          );
          pairTeacherConversations.set(conversationKey, conversation);
          migratedConversations++;
        }

        // Determine sender
        const senderTeacher = await Teacher.findById(msg.fromTeacher);
        const senderName = senderTeacher?.fullName || 'Teacher';

        // Create message
        const newMessage = new Message({
          conversationId: conversation._id,
          senderRole: 'teacher',
          senderId: msg.fromTeacher,
          senderRoleRef: 'Teacher',
          senderName,
          body: msg.message || '',
          attachments: (msg.files || []).map(file => ({
            filename: file.name || '',
            url: file.url || '',
            mimetype: file.type || 'application/octet-stream',
            size: file.size || 0
          })),
          readBy: msg.read ? [{
            role: 'teacher',
            userId: msg.toTeacher,
            readAt: msg.readAt || new Date()
          }] : [],
          priority: 'normal',
          system: false,
          createdAt: msg.createdAt || new Date()
        });

        await newMessage.save();
        migratedMessages++;

        // Update conversation
        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessageAt: msg.createdAt || new Date(),
          lastMessageId: newMessage._id,
          $inc: { messageCount: 1 }
        });

      } catch (error) {
        console.error(`❌ Error migrating pair message ${msg._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Migration Complete!');
    console.log(`   Conversations created: ${migratedConversations}`);
    console.log(`   Messages migrated: ${migratedMessages}`);
    console.log(`   Errors: ${errors}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateMessages();

