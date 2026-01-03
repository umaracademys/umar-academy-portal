/**
 * Unified Message Model
 * 
 * This model represents a single message within a conversation.
 * All messages are immutable and auditable.
 * 
 * @module models/Message
 */

const mongoose = require('mongoose');

/**
 * Message Schema
 * 
 * Rules:
 * - Messages are immutable (no updates, only redaction)
 * - Read receipts tracked per role
 * - System messages cannot be deleted
 */
const messageSchema = new mongoose.Schema({
  // Conversation reference
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  
  // Sender information
  senderRole: {
    type: String,
    enum: ['teacher', 'student', 'admin'],
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderRoleRef'
  },
  senderRoleRef: {
    type: String,
    enum: ['Teacher', 'Student', 'User'],
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  
  // Message content
  body: {
    type: String,
    required: true,
    trim: true
  },
  
  // Redaction (for moderation)
  redacted: {
    type: Boolean,
    default: false
  },
  redactedAt: {
    type: Date,
    default: null
  },
  redactedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  redactedBody: {
    type: String,
    default: null // Store original body when redacted
  },
  redactionReason: {
    type: String,
    default: null
  },
  
  // Attachments
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Read receipts - tracked per role
  readBy: [{
    role: {
      type: String,
      enum: ['teacher', 'student', 'admin'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  
  // System message flag
  system: {
    type: Boolean,
    default: false
  },
  
  // Audit trail
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
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ priority: 1, createdAt: -1 });
messageSchema.index({ system: 1, createdAt: -1 });
messageSchema.index({ redacted: 1 });

/**
 * Virtual: Get display body (redacted or original)
 */
messageSchema.virtual('displayBody').get(function() {
  if (this.redacted) {
    return '[Message redacted by administration]';
  }
  return this.body;
});

/**
 * Instance method: Mark as read by role/user
 */
messageSchema.methods.markAsRead = function(role, userId) {
  const alreadyRead = this.readBy.some(
    r => r.role === role && r.userId.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({
      role,
      userId,
      readAt: new Date()
    });
  }
  
  return this.save();
};

/**
 * Instance method: Redact message (admin only)
 */
messageSchema.methods.redact = function(adminId, reason) {
  if (!this.redacted) {
    this.redactedBody = this.body; // Preserve original
    this.body = '[Message redacted by administration]';
    this.redacted = true;
    this.redactedAt = new Date();
    this.redactedBy = adminId;
    this.redactionReason = reason || 'Content violation';
  }
  
  return this.save();
};

/**
 * Pre-save hook: Prevent updates to non-system messages
 */
messageSchema.pre('save', function(next) {
  if (this.isModified('body') && !this.isNew && !this.system) {
    // Only allow body modification if redacting
    if (!this.redacted) {
      return next(new Error('Messages are immutable. Use redact() method for moderation.'));
    }
  }
  next();
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

