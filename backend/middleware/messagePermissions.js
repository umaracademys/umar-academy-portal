/**
 * Message Permission Middleware
 * 
 * Role-based access control for messaging system.
 * All checks are server-side enforced.
 * 
 * @module middleware/messagePermissions
 */

const mongoose = require('mongoose');

/**
 * Check if user can access conversation
 * 
 * @param {Object} user - Authenticated user
 * @param {Object} conversation - Conversation document
 * @returns {boolean}
 */
function canAccessConversation(user, conversation) {
  if (!user || !conversation) return false;
  
  // Super admin can access everything
  if (user.role === 'superadmin') return true;
  
  // Admin can access everything
  if (user.role === 'admin') return true;
  
  // Check if user is a participant
  const userInParticipants = conversation.participants.some(
    p => p.userId.toString() === user._id?.toString() || p.userId.toString() === user.id?.toString()
  );
  
  return userInParticipants;
}

/**
 * Check if user can send message in conversation
 * 
 * @param {Object} user - Authenticated user
 * @param {Object} conversation - Conversation document
 * @returns {Object} - { allowed: boolean, reason: string }
 */
function canSendMessage(user, conversation) {
  if (!user || !conversation) {
    return { allowed: false, reason: 'User or conversation not found' };
  }
  
  // Check if conversation is locked
  if (conversation.locked) {
    return { 
      allowed: false, 
      reason: 'Conversation is locked by administration',
      lockedBy: conversation.lockedBy,
      lockedAt: conversation.lockedAt
    };
  }
  
  // Super admin and admin can always send
  if (user.role === 'superadmin' || user.role === 'admin') {
    return { allowed: true };
  }
  
  // Check if user is a participant
  const userInParticipants = conversation.participants.some(
    p => p.userId.toString() === user._id?.toString() || p.userId.toString() === user.id?.toString()
  );
  
  if (!userInParticipants) {
    return { allowed: false, reason: 'User is not a participant in this conversation' };
  }
  
  // Check role-specific permissions
  if (conversation.type === 'teacher_student') {
    // Only teachers and students can send (admin already checked)
    if (user.role !== 'teacher' && user.role !== 'student') {
      return { allowed: false, reason: 'Only teachers and students can send messages in teacher-student conversations' };
    }
  } else if (conversation.type === 'pair_teacher') {
    // Only teachers can send
    if (user.role !== 'teacher') {
      return { allowed: false, reason: 'Only teachers can send messages in pair-teacher conversations' };
    }
  }
  
  return { allowed: true };
}

/**
 * Check if user can moderate conversation
 * 
 * @param {Object} user - Authenticated user
 * @returns {boolean}
 */
function canModerate(user) {
  if (!user) return false;
  return user.role === 'superadmin' || user.role === 'admin';
}

/**
 * Express middleware: Check conversation access
 */
async function checkConversationAccess(req, res, next) {
  try {
    const Conversation = mongoose.model('Conversation');
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }
    
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check access
    if (!canAccessConversation(req.user, conversation)) {
      return res.status(403).json({ 
        error: 'Access denied',
        code: 'ACCESS_DENIED',
        message: 'You do not have permission to access this conversation'
      });
    }
    
    // Attach conversation to request
    req.conversation = conversation;
    next();
  } catch (error) {
    console.error('Error checking conversation access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express middleware: Check send message permission
 */
async function checkSendPermission(req, res, next) {
  try {
    const Conversation = mongoose.model('Conversation');
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }
    
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check send permission
    const permission = canSendMessage(req.user, conversation);
    
    if (!permission.allowed) {
      return res.status(403).json({
        error: 'Cannot send message',
        code: 'SEND_DENIED',
        reason: permission.reason,
        lockedBy: permission.lockedBy,
        lockedAt: permission.lockedAt
      });
    }
    
    req.conversation = conversation;
    next();
  } catch (error) {
    console.error('Error checking send permission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express middleware: Check moderation permission
 */
function checkModerationPermission(req, res, next) {
  if (!canModerate(req.user)) {
    return res.status(403).json({
      error: 'Access denied',
      code: 'MODERATION_DENIED',
      message: 'Only administrators can perform moderation actions'
    });
  }
  next();
}

module.exports = {
  canAccessConversation,
  canSendMessage,
  canModerate,
  checkConversationAccess,
  checkSendPermission,
  checkModerationPermission
};

