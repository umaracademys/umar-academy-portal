/**
 * Unified Conversation Model
 * 
 * This model represents a conversation between participants.
 * Admin is ALWAYS included as a participant at the database level.
 * 
 * @module models/Conversation
 */

const mongoose = require('mongoose');

/**
 * Conversation Schema
 * 
 * Rules:
 * - Admin must always be included in participants
 * - Type determines conversation context
 * - Locked conversations prevent new messages
 */
const conversationSchema = new mongoose.Schema({
  // Conversation type
  type: {
    type: String,
    enum: ['teacher_student', 'pair_teacher'],
    required: true,
    index: true
  },
  
  // Participants - MUST always include admin
  // Format: [{ role: 'teacher'|'student'|'admin', userId: ObjectId }]
  participants: [{
    role: {
      type: String,
      enum: ['teacher', 'student', 'admin'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'participants.roleRef'
    },
    roleRef: {
      type: String,
      enum: ['Teacher', 'Student', 'User'],
      required: true
    },
    // For quick lookup
    name: String,
    email: String
  }],
  
  // Context information
  context: {
    // For teacher_student conversations
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null
    },
    // For pair_teacher conversations
    pairId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherPair',
      default: null
    },
    // Additional context
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null
    }
  },
  
  // Moderation
  locked: {
    type: Boolean,
    default: false,
    index: true
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lockedAt: {
    type: Date,
    default: null
  },
  lockReason: {
    type: String,
    default: null
  },
  
  // Metadata
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  
  // Statistics
  messageCount: {
    type: Number,
    default: 0
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
conversationSchema.index({ type: 1, 'context.studentId': 1 });
conversationSchema.index({ type: 1, 'context.pairId': 1 });
conversationSchema.index({ 'participants.userId': 1, type: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ locked: 1, lastMessageAt: -1 });

/**
 * Pre-save hook: Ensure admin is always included
 */
conversationSchema.pre('save', async function(next) {
  try {
    // Find admin user (try superadmin first, then admin)
    const User = mongoose.model('User');
    let admin = await User.findOne({ role: 'superadmin' }).select('_id name email');
    
    if (!admin) {
      admin = await User.findOne({ role: 'admin' }).select('_id name email');
    }
    
    if (!admin) {
      console.warn('⚠️  No admin user found. Conversation created without admin participant.');
      return next(); // Allow creation but log warning
    }
    
    // Check if admin is already in participants
    const adminInParticipants = this.participants.some(
      p => p.role === 'admin' && p.userId.toString() === admin._id.toString()
    );
    
    // Add admin if not present
    if (!adminInParticipants) {
      this.participants.push({
        role: 'admin',
        userId: admin._id,
        roleRef: 'User',
        name: admin.name || 'Super Admin',
        email: admin.email || 'sadmin@umaracademy.org'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in Conversation pre-save hook:', error);
    next(error);
  }
});

/**
 * Static method: Find or create conversation
 */
conversationSchema.statics.findOrCreate = async function(type, participants, context = {}) {
  try {
    // Ensure admin is included
    const User = mongoose.model('User');
    let admin = await User.findOne({ role: 'superadmin' }).select('_id name email');
    
    if (!admin) {
      admin = await User.findOne({ role: 'admin' }).select('_id name email');
    }
    
    if (!admin) {
      console.warn('⚠️  No admin user found. Conversation will be created without admin participant.');
      // Continue without admin, but log warning
    }
    
    // Build participant list with admin
    const allParticipants = [...participants];
    
    if (admin) {
      const adminInList = allParticipants.some(
        p => p.role === 'admin' && p.userId.toString() === admin._id.toString()
      );
      
      if (!adminInList) {
        allParticipants.push({
          role: 'admin',
          userId: admin._id,
          roleRef: 'User',
          name: admin.name || 'Super Admin',
          email: admin.email || 'sadmin@umaracademy.org'
        });
      }
    }
    
    // Create unique key for conversation lookup (excluding admin for matching)
    const nonAdminParticipants = allParticipants.filter(p => p.role !== 'admin');
    const participantIds = nonAdminParticipants
      .map(p => `${p.role}:${p.userId.toString()}`)
      .sort()
      .join('|');
    
    // Try to find existing conversation
    let conversation = await this.findOne({
      type,
      'context.studentId': context.studentId || null,
      'context.pairId': context.pairId || null
    });
    
    // Verify participants match (excluding admin)
    if (conversation) {
      const existingNonAdmin = conversation.participants.filter(p => p.role !== 'admin');
      const existingIds = existingNonAdmin
        .map(p => `${p.role}:${p.userId.toString()}`)
        .sort()
        .join('|');
      
      if (existingIds !== participantIds) {
        conversation = null; // Participants don't match, create new
      }
    }
    
    // Create if not found
    if (!conversation) {
      conversation = new this({
        type,
        participants: allParticipants,
        context,
        createdBy: allParticipants.find(p => p.role !== 'admin')?.userId || (admin?._id)
      });
      await conversation.save();
    }
    
    return conversation;
  } catch (error) {
    console.error('Error in Conversation.findOrCreate:', error);
    throw error;
  }
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;

