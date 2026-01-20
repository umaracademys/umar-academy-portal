/**
 * Unified Notification Model
 * 
 * Single, write-optimized notification model replacing AdminNotification and TeacherNotification.
 * 
 * Key Features:
 * - Deduplication via unique index (recipientId, type, entityType, entityId)
 * - Upsert-only writes (never use .create())
 * - TTL cleanup for expired notifications
 * - Index-optimized queries
 * - Entity normalization (entityType + entityId instead of assignmentId, ticketId, etc.)
 * 
 * @module models/Notification
 */

const mongoose = require('mongoose');

/**
 * Notification Schema
 * 
 * Rules:
 * - NEVER use .create() - always use upsert pattern via helper functions
 * - entityType + entityId must be provided (normalized entity reference)
 * - recipientId + recipientRole determine who receives the notification
 * - Unique index prevents duplicates (recipientId, type, entityType, entityId)
 * - TTL index auto-deletes expired notifications
 */
const notificationSchema = new mongoose.Schema({
  // Recipient identification
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    // No ref - can be User, Teacher, Student, Admin
    // Use recipientRole to determine which collection
  },
  
  recipientRole: {
    type: String,
    enum: ['admin', 'teacher', 'student'],
    required: true,
    index: true
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      'ticket_created',
      'ticket_updated',
      'assignment_submitted',
      'student_enrolled',
      'student_registration_request',
      'weekly_evaluation_submitted',
      'weekly_evaluation_approved',
      'weekly_evaluation_rejected',
      'weekly_evaluation_feedback',
      'recitation_review_pending',
      'message_received',
      'system'
    ],
    required: true
  },
  
  // Normalized entity reference (replaces assignmentId, ticketId, recitationReviewId, etc.)
  entityType: {
    type: String,
    enum: [
      'ticket',
      'assignment',
      'student',
      'weekly_evaluation',
      'recitation_review',
      'conversation',
      'message'
    ],
    required: true
  },
  
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
    // No ref - use entityType to determine which collection
  },
  
  // Notification content
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  actionUrl: {
    type: String,
    default: null
    // Optional deep link to related entity
  },
  
  // Read status
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  
  readAt: {
    type: Date,
    default: null
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal',
    index: true
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
    // Optional: who triggered the notification creation
  },
  
  source: {
    type: String,
    enum: ['api', 'system', 'manual'],
    default: 'api'
  },
  
  // Expiry (for TTL cleanup)
  expiresAt: {
    type: Date,
    default: null,
    index: { expireAfterSeconds: 0 }
    // TTL index: auto-delete when expiresAt is reached
    // Set expiresAt to null for notifications that never expire
  },
  
  // Additional metadata (for flexible storage)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

/**
 * CRITICAL INDEXES
 * 
 * 1. Query Performance Indexes
 *    - { recipientId: 1, read: 1, createdAt: -1 }
 *      Used for: "Get unread notifications for user, sorted by newest"
 *    - { recipientId: 1, createdAt: -1 }
 *      Used for: "Get all notifications for user, sorted by newest"
 * 
 * 2. Deduplication Index (UNIQUE)
 *    - { recipientId: 1, type: 1, entityType: 1, entityId: 1 }
 *      Prevents duplicate notifications for same event
 *      Enables safe upsert operations
 * 
 * 3. TTL Index
 *    - { expiresAt: 1 } with expireAfterSeconds: 0
 *      Auto-deletes expired notifications
 *      Set expiresAt to null for notifications that never expire
 */
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1, entityType: 1, entityId: 1 }, { unique: true });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Instance method: Mark notification as read
 */
notificationSchema.methods.markAsRead = function() {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
  }
  return this.save();
};

/**
 * Static method: Create or update notification (DEDUPLICATION)
 * 
 * ⚠️ CRITICAL: This is the ONLY way to create notifications.
 * 
 * Uses upsert pattern to prevent duplicates:
 * - If notification exists (same recipientId, type, entityType, entityId), update it
 * - If notification doesn't exist, create it
 * 
 * This ensures:
 * - No duplicates even with retries/race conditions
 * - Idempotent notification creation
 * - Safe concurrent writes
 * 
 * @param {Object} notificationData - Notification data
 * @param {ObjectId} notificationData.recipientId - Who receives the notification
 * @param {String} notificationData.recipientRole - 'admin' | 'teacher' | 'student'
 * @param {String} notificationData.type - Notification type
 * @param {String} notificationData.entityType - Entity type (ticket, assignment, etc.)
 * @param {ObjectId} notificationData.entityId - Entity ID
 * @param {String} notificationData.title - Notification title
 * @param {String} notificationData.message - Notification message
 * @param {String} [notificationData.actionUrl] - Optional deep link
 * @param {String} [notificationData.priority] - 'low' | 'normal' | 'high'
 * @param {ObjectId} [notificationData.createdBy] - Who created the notification
 * @param {String} [notificationData.source] - 'api' | 'system' | 'manual'
 * @param {Date} [notificationData.expiresAt] - Optional expiry date
 * @param {Object} [notificationData.metadata] - Optional metadata
 * 
 * @returns {Promise<Notification>} The created or updated notification
 */
notificationSchema.statics.createOrUpdate = async function(notificationData) {
  const {
    recipientId,
    recipientRole,
    type,
    entityType,
    entityId,
    title,
    message,
    actionUrl = null,
    priority = 'normal',
    createdBy = null,
    source = 'api',
    expiresAt = null,
    metadata = {}
  } = notificationData;
  
  // Validate required fields
  if (!recipientId || !recipientRole || !type || !entityType || !entityId || !title || !message) {
    throw new Error('Missing required notification fields: recipientId, recipientRole, type, entityType, entityId, title, message');
  }
  
  // Convert string IDs to ObjectId if needed
  const normalizedRecipientId = mongoose.Types.ObjectId.isValid(recipientId) 
    ? new mongoose.Types.ObjectId(recipientId) 
    : recipientId;
  const normalizedEntityId = mongoose.Types.ObjectId.isValid(entityId) 
    ? new mongoose.Types.ObjectId(entityId) 
    : entityId;
  const normalizedCreatedBy = createdBy && mongoose.Types.ObjectId.isValid(createdBy)
    ? new mongoose.Types.ObjectId(createdBy)
    : createdBy;
  
  // Deduplication keys (must match unique index)
  const dedupeKeys = {
    recipientId: normalizedRecipientId,
    type,
    entityType,
    entityId: normalizedEntityId
  };
  
  // Data to set on insert (new notification) or update (existing notification)
  const updateData = {
    $set: {
      recipientRole,
      title,
      message,
      actionUrl,
      priority,
      source,
      expiresAt,
      metadata,
      updatedAt: new Date()
    },
    $setOnInsert: {
      read: false,
      readAt: null,
      createdAt: new Date()
    }
  };
  
  // Set createdBy only on insert (don't overwrite on update)
  if (normalizedCreatedBy) {
    updateData.$setOnInsert.createdBy = normalizedCreatedBy;
  }
  
  // Upsert: create if doesn't exist, update if exists
  // This is race-condition safe and retry-safe
  const result = await this.updateOne(
    dedupeKeys,
    updateData,
    { upsert: true, runValidators: true }
  );
  
  // Fetch and return the notification
  const notification = await this.findOne(dedupeKeys);
  return notification;
};

/**
 * Static method: Create notification for multiple recipients
 * 
 * Convenience method to create the same notification for multiple users.
 * Uses createOrUpdate internally, so deduplication is automatic.
 * 
 * @param {Array<ObjectId>} recipientIds - Array of recipient IDs
 * @param {String} recipientRole - 'admin' | 'teacher' | 'student'
 * @param {Object} notificationData - Notification data (same as createOrUpdate)
 * @returns {Promise<Array<Notification>>} Array of created/updated notifications
 */
notificationSchema.statics.createForRecipients = async function(recipientIds, recipientRole, notificationData) {
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return [];
  }
  
  const notifications = await Promise.all(
    recipientIds.map(recipientId => 
      this.createOrUpdate({
        ...notificationData,
        recipientId,
        recipientRole
      })
    )
  );
  
  return notifications;
};

/**
 * Static method: Create notification for all admins
 * 
 * Convenience method to notify all admin users.
 * Requires User model to be available.
 * 
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Array<Notification>>} Array of created/updated notifications
 */
notificationSchema.statics.createForAllAdmins = async function(notificationData) {
  const User = mongoose.model('User');
  const admins = await User.find({ 
    role: { $in: ['admin', 'superadmin'] } 
  }).select('_id').lean();
  
  const adminIds = admins.map(admin => admin._id);
  
  return this.createForRecipients(adminIds, 'admin', notificationData);
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
