/**
 * Unified Messaging API Routes
 * 
 * REST endpoints for secure, admin-monitored messaging system.
 * 
 * @module routes/messages
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// authenticateToken middleware - defined here since it needs JWT_SECRET from environment
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};
const { 
  validateMessageMiddleware, 
  validateAttachmentsMiddleware 
} = require('../middleware/messageValidation');
const {
  checkConversationAccess,
  checkSendPermission,
  checkModerationPermission
} = require('../middleware/messagePermissions');
const rateLimit = require('express-rate-limit');

// Load models
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = mongoose.model('User');
const Teacher = mongoose.model('Teacher');
const Student = mongoose.model('Student');
const TeacherPair = mongoose.model('TeacherPair');

// Rate limiting for message sending
const sendMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 messages per minute
  message: 'Too many messages sent. Please wait a moment.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /api/conversations
 * Get conversations for current user
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { type, page = 1, limit = 20 } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by type if provided
    if (type && ['teacher_student', 'pair_teacher'].includes(type)) {
      query.type = type;
    }
    
    // For non-admin users, only show their conversations
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      query['participants.userId'] = user._id || user.id;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('participants.userId', 'name email fullName')
      .populate('context.studentId', 'fullName email')
      .populate('context.pairId', 'name program')
      .populate('context.teacherId', 'fullName email')
      .lean();
    
    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          'readBy.userId': { $ne: user._id || user.id },
          senderId: { $ne: user._id || user.id }
        });
        
        return {
          ...conv,
          unreadCount
        };
      })
    );
    
    res.json({
      conversations: conversationsWithUnread,
      page: parseInt(page),
      limit: parseInt(limit),
      total: await Conversation.countDocuments(query)
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { type, participants, context } = req.body;
    const user = req.user;
    
    // Validate type
    if (!type || !['teacher_student', 'pair_teacher'].includes(type)) {
      return res.status(400).json({ error: 'Invalid conversation type' });
    }
    
    // Validate participants
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'Participants are required' });
    }
    
    // Build participant list with proper references
    const participantList = await Promise.all(
      participants.map(async (p) => {
        let roleRef = 'User';
        let name = '';
        let email = '';
        
        if (p.role === 'teacher') {
          roleRef = 'Teacher';
          const teacher = await Teacher.findById(p.userId);
          name = teacher?.fullName || '';
          email = teacher?.email || '';
        } else if (p.role === 'student') {
          roleRef = 'Student';
          const student = await Student.findById(p.userId);
          name = student?.fullName || '';
          email = student?.email || '';
        } else if (p.role === 'admin') {
          roleRef = 'User';
          const adminUser = await User.findById(p.userId);
          name = adminUser?.name || '';
          email = adminUser?.email || '';
        }
        
        return {
          role: p.role,
          userId: p.userId,
          roleRef,
          name,
          email
        };
      })
    );
    
    // Create conversation (admin will be auto-added in pre-save hook)
    const conversation = await Conversation.findOrCreate(type, participantList, context || {});
    
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversations/:conversationId/messages
 * Get messages in a conversation (paginated)
 */
router.get('/conversations/:conversationId/messages', 
  authenticateToken, 
  checkConversationAccess,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const user = req.user;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const messages = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('senderId', 'name email fullName')
        .lean();
      
      // Reverse to show oldest first
      messages.reverse();
      
      // Mark messages as read for current user
      const unreadMessages = messages.filter(m => 
        !m.readBy.some(r => 
          r.userId.toString() === (user._id || user.id).toString()
        )
      );
      
      if (unreadMessages.length > 0) {
        const unreadIds = unreadMessages.map(m => m._id);
        await Message.updateMany(
          { _id: { $in: unreadIds } },
          { 
            $push: { 
              readBy: { 
                role: user.role, 
                userId: user._id || user.id,
                readAt: new Date()
              }
            }
          }
        );
      }
      
      res.json({
        messages,
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Message.countDocuments({ conversationId })
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/conversations/:conversationId/messages
 * Send a message in a conversation
 */
router.post('/conversations/:conversationId/messages',
  authenticateToken,
  checkSendPermission,
  sendMessageLimiter,
  validateMessageMiddleware,
  validateAttachmentsMiddleware,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { body, attachments = [], priority = 'normal' } = req.body;
      const user = req.user;
      
      // Get sender information
      let senderRoleRef = 'User';
      let senderName = user.name || user.email || 'Unknown';
      
      if (user.role === 'teacher') {
        senderRoleRef = 'Teacher';
        const teacher = await Teacher.findOne({ email: user.email });
        senderName = teacher?.fullName || senderName;
      } else if (user.role === 'student') {
        senderRoleRef = 'Student';
        const student = await Student.findOne({ email: user.email });
        senderName = student?.fullName || senderName;
      }
      
      // Create message
      const message = new Message({
        conversationId,
        senderRole: user.role,
        senderId: user._id || user.id,
        senderRoleRef,
        senderName,
        body: body.trim(),
        attachments: attachments || [],
        priority: priority || 'normal',
        system: false
      });
      
      await message.save();
      
      // Update conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessageAt: new Date(),
        lastMessageId: message._id,
        $inc: { messageCount: 1 }
      });
      
      // Populate and return
      const populated = await Message.findById(message._id)
        .populate('senderId', 'name email fullName')
        .lean();
      
      res.status(201).json(populated);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/conversations/:conversationId/messages/:messageId/read
 * Mark a message as read
 */
router.put('/conversations/:conversationId/messages/:messageId/read',
  authenticateToken,
  checkConversationAccess,
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const user = req.user;
      
      const message = await Message.findById(messageId);
      
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      await message.markAsRead(user.role, user._id || user.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/conversations/:conversationId/messages/mark-read
 * Mark multiple messages as read (bulk)
 */
router.put('/conversations/:conversationId/messages/mark-read',
  authenticateToken,
  checkConversationAccess,
  async (req, res) => {
    try {
      const { messageIds } = req.body;
      const user = req.user;
      
      if (!messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({ error: 'messageIds array is required' });
      }
      
      await Message.updateMany(
        { _id: { $in: messageIds } },
        {
          $push: {
            readBy: {
              role: user.role,
              userId: user._id || user.id,
              readAt: new Date()
            }
          }
        }
      );
      
      res.json({ success: true, marked: messageIds.length });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/conversations/:conversationId/messages/upload
 * Upload file attachment
 */
router.post('/conversations/:conversationId/messages/upload',
  authenticateToken,
  checkConversationAccess,
  async (req, res) => {
    try {
      // File upload handling (similar to existing implementation)
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const timestamp = Date.now();
          const uniqueFilename = `message-${timestamp}-${Math.random().toString(36).substring(7)}`;
          
          // Determine file type from content-type header
          const contentType = req.headers['content-type'] || 'application/octet-stream';
          const extension = contentType.split('/')[1] || 'bin';
          
          const fs = require('fs');
          const path = require('path');
          const messagesDir = path.join(__dirname, '../uploads/messages');
          
          if (!fs.existsSync(messagesDir)) {
            fs.mkdirSync(messagesDir, { recursive: true });
          }
          
          const filePath = path.join(messagesDir, `${uniqueFilename}.${extension}`);
          fs.writeFileSync(filePath, buffer);
          
          const fileUrl = `/uploads/messages/${uniqueFilename}.${extension}`;
          
          res.json({
            filename: `${uniqueFilename}.${extension}`,
            url: fileUrl,
            mimetype: contentType,
            size: buffer.length
          });
        } catch (error) {
          console.error('Error uploading file:', error);
          res.status(500).json({ error: error.message });
        }
      });
    } catch (error) {
      console.error('Error handling file upload:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/conversations/:conversationId/lock
 * Lock a conversation (admin only)
 */
router.put('/conversations/:conversationId/lock',
  authenticateToken,
  checkModerationPermission,
  checkConversationAccess,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { reason } = req.body;
      const user = req.user;
      
      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          locked: true,
          lockedBy: user._id || user.id,
          lockedAt: new Date(),
          lockReason: reason || 'Administrative action'
        },
        { new: true }
      );
      
      res.json(conversation);
    } catch (error) {
      console.error('Error locking conversation:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/conversations/:conversationId/unlock
 * Unlock a conversation (admin only)
 */
router.put('/conversations/:conversationId/unlock',
  authenticateToken,
  checkModerationPermission,
  checkConversationAccess,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      
      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          locked: false,
          lockedBy: null,
          lockedAt: null,
          lockReason: null
        },
        { new: true }
      );
      
      res.json(conversation);
    } catch (error) {
      console.error('Error unlocking conversation:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/conversations/:conversationId/messages/:messageId/redact
 * Redact a message (admin only)
 */
router.put('/conversations/:conversationId/messages/:messageId/redact',
  authenticateToken,
  checkModerationPermission,
  checkConversationAccess,
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const { reason } = req.body;
      const user = req.user;
      
      const message = await Message.findById(messageId);
      
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      await message.redact(user._id || user.id, reason);
      
      res.json(message);
    } catch (error) {
      console.error('Error redacting message:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/conversations/:conversationId/messages/system
 * Send a system message (admin only)
 */
router.post('/conversations/:conversationId/messages/system',
  authenticateToken,
  checkModerationPermission,
  checkConversationAccess,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { body } = req.body;
      const user = req.user;
      
      const message = new Message({
        conversationId,
        senderRole: 'admin',
        senderId: user._id || user.id,
        senderRoleRef: 'User',
        senderName: 'Administration',
        body: body.trim(),
        attachments: [],
        priority: 'normal',
        system: true
      });
      
      await message.save();
      
      // Update conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessageAt: new Date(),
        lastMessageId: message._id,
        $inc: { messageCount: 1 }
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error sending system message:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/conversations/admin/stats
 * Get admin statistics (admin only)
 */
router.get('/conversations/admin/stats',
  authenticateToken,
  checkModerationPermission,
  async (req, res) => {
    try {
      const totalConversations = await Conversation.countDocuments();
      const activeConversations = await Conversation.countDocuments({ locked: false });
      const lockedConversations = await Conversation.countDocuments({ locked: true });
      const totalMessages = await Message.countDocuments();
      const unreadMessages = await Message.countDocuments({
        'readBy.userId': { $exists: false }
      });
      const redactedMessages = await Message.countDocuments({ redacted: true });
      
      res.json({
        totalConversations,
        activeConversations,
        lockedConversations,
        totalMessages,
        unreadMessages,
        redactedMessages
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;

