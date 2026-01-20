/**
 * Notification Helper Functions
 * 
 * Utility functions for creating notifications using the unified Notification model.
 * 
 * These helpers enforce:
 * - Entity normalization (entityType + entityId)
 * - Deduplication (via upsert pattern)
 * - Proper priority mapping
 * - Action URL generation
 * 
 * ⚠️ CRITICAL: Always use these helpers, never use Notification.create()
 * 
 * @module utils/notificationHelpers
 */

const Notification = require('../models/Notification');
const mongoose = require('mongoose');

/**
 * Map old priority values to new normalized values
 */
const PRIORITY_MAP = {
  'low': 'low',
  'medium': 'normal',
  'high': 'high'
};

/**
 * Create notification for ticket created event
 * 
 * @param {Object} ticket - Ticket document
 * @param {ObjectId|String} adminId - Admin user ID (optional, will notify all admins if not provided)
 * @param {ObjectId|String} createdBy - Who created the notification (optional)
 * @returns {Promise<Notification|Array<Notification>>}
 */
async function notifyTicketCreated(ticket, adminId = null, createdBy = null) {
  const entityId = mongoose.Types.ObjectId.isValid(ticket._id) 
    ? ticket._id 
    : new mongoose.Types.ObjectId(ticket._id);
  
  const notificationData = {
    type: 'ticket_created',
    entityType: 'ticket',
    entityId,
    title: 'New Ticket Submitted',
    message: `${ticket.studentName || 'A student'} submitted a ${ticket.type?.toUpperCase() || 'recitation'} ticket${ticket.assignedTeacherName ? ` (assigned to ${ticket.assignedTeacherName})` : ''}`,
    actionUrl: `/dashboard?ticketId=${entityId}`,
    priority: 'high',
    createdBy: createdBy ? (mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : new mongoose.Types.ObjectId(createdBy)) : null,
    source: 'api',
    metadata: {
      studentId: ticket.studentId,
      studentName: ticket.studentName,
      assignedTeacherId: ticket.assignedTeacherId,
      assignedTeacherName: ticket.assignedTeacherName,
      ticketType: ticket.type
    }
  };
  
  if (adminId) {
    // Notify specific admin
    return Notification.createOrUpdate({
      ...notificationData,
      recipientId: mongoose.Types.ObjectId.isValid(adminId) ? adminId : new mongoose.Types.ObjectId(adminId),
      recipientRole: 'admin'
    });
  } else {
    // Notify all admins
    return Notification.createForAllAdmins(notificationData);
  }
}

/**
 * Create notification for ticket updated event
 * 
 * @param {Object} ticket - Ticket document
 * @param {ObjectId|String} recipientId - Who should receive the notification
 * @param {String} recipientRole - 'admin' | 'teacher' | 'student'
 * @param {ObjectId|String} createdBy - Who created the notification (optional)
 * @returns {Promise<Notification>}
 */
async function notifyTicketUpdated(ticket, recipientId, recipientRole, createdBy = null) {
  const entityId = mongoose.Types.ObjectId.isValid(ticket._id) 
    ? ticket._id 
    : new mongoose.Types.ObjectId(ticket._id);
  
  return Notification.createOrUpdate({
    recipientId: mongoose.Types.ObjectId.isValid(recipientId) ? recipientId : new mongoose.Types.ObjectId(recipientId),
    recipientRole,
    type: 'ticket_updated',
    entityType: 'ticket',
    entityId,
    title: 'Ticket Updated',
    message: `Ticket for ${ticket.studentName || 'student'} has been updated`,
    actionUrl: `/dashboard?ticketId=${entityId}`,
    priority: 'normal',
    createdBy: createdBy ? (mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : new mongoose.Types.ObjectId(createdBy)) : null,
    source: 'api',
    metadata: {
      ticketStatus: ticket.status,
      studentId: ticket.studentId
    }
  });
}

/**
 * Create notification for assignment submitted event
 * 
 * @param {Object} assignment - Assignment document
 * @param {ObjectId|String} createdBy - Who created the assignment (optional)
 * @returns {Promise<Array<Notification>>}
 */
async function notifyAssignmentSubmitted(assignment, createdBy = null) {
  const entityId = mongoose.Types.ObjectId.isValid(assignment._id) 
    ? assignment._id 
    : new mongoose.Types.ObjectId(assignment._id);
  
  const assignedByName = assignment.assignedByName || 'System';
  const studentName = assignment.studentName || 'a student';
  const hasHomework = assignment.homework?.enabled;
  
  const notificationData = {
    type: 'assignment_submitted',
    entityType: 'assignment',
    entityId,
    title: 'New Assignment Created',
    message: `${assignedByName} created a new assignment for ${studentName}${hasHomework ? ' (with homework)' : ''}`,
    actionUrl: `/assignments?assignmentId=${entityId}`,
    priority: 'normal',
    createdBy: createdBy ? (mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : new mongoose.Types.ObjectId(createdBy)) : null,
    source: 'api',
    metadata: {
      studentId: assignment.studentId,
      studentName,
      hasHomework
    }
  };
  
  // Notify all admins
  return Notification.createForAllAdmins(notificationData);
}

/**
 * Create notification for student enrolled event
 * 
 * @param {Object} student - Student document
 * @param {Array<String>} teacherIds - Array of assigned teacher IDs (optional)
 * @param {ObjectId|String} createdBy - Who created the student (optional)
 * @returns {Promise<Array<Notification>>}
 */
async function notifyStudentEnrolled(student, teacherIds = [], createdBy = null) {
  const entityId = mongoose.Types.ObjectId.isValid(student._id) 
    ? student._id 
    : new mongoose.Types.ObjectId(student._id);
  
  const studentName = student.fullName || student.name || 'A new student';
  const program = student.program || '';
  const teacherCount = teacherIds.length;
  
  const notificationData = {
    type: 'student_enrolled',
    entityType: 'student',
    entityId,
    title: 'New Student Enrolled',
    message: `${studentName} has been enrolled${program ? ` in ${program}` : ''}${teacherCount > 0 ? ` and assigned to ${teacherCount} teacher(s)` : ''}`,
    actionUrl: `/dashboard?studentId=${entityId}`,
    priority: 'normal',
    createdBy: createdBy ? (mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : new mongoose.Types.ObjectId(createdBy)) : null,
    source: 'api',
    metadata: {
      program,
      teacherCount,
      teacherIds
    }
  };
  
  // Notify all admins
  return Notification.createForAllAdmins(notificationData);
}

/**
 * Create notification for weekly evaluation approved event
 * 
 * @param {Object} evaluation - Weekly evaluation document
 * @param {String} reviewedByName - Name of reviewer
 * @param {String} adminFeedback - Admin feedback (optional)
 * @param {ObjectId|String} createdBy - Who approved the evaluation (optional)
 * @returns {Promise<Array<Notification>>}
 */
async function notifyWeeklyEvaluationApproved(evaluation, reviewedByName, adminFeedback = null, createdBy = null) {
  const entityId = mongoose.Types.ObjectId.isValid(evaluation.id || evaluation._id) 
    ? (evaluation.id || evaluation._id)
    : new mongoose.Types.ObjectId(evaluation.id || evaluation._id);
  
  const weekStart = new Date(evaluation.weekStartDate).toLocaleDateString();
  const studentName = evaluation.studentName || 'student';
  
  // Notify admin
  const adminNotifications = await Notification.createForAllAdmins({
    type: 'weekly_evaluation_approved',
    entityType: 'weekly_evaluation',
    entityId,
    title: 'Weekly Evaluation Approved',
    message: `${reviewedByName} approved weekly evaluation for ${studentName} (Week of ${weekStart})`,
    actionUrl: `/dashboard?evaluationId=${entityId}`,
    priority: 'high',
    createdBy: createdBy ? (mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : new mongoose.Types.ObjectId(createdBy)) : null,
    source: 'api',
    metadata: {
      studentId: evaluation.studentId,
      studentName,
      teacherId: evaluation.teacherId,
      weekStartDate: evaluation.weekStartDate,
      adminFeedback
    }
  });
  
  // Notify teacher
  const User = mongoose.model('User');
  const Teacher = mongoose.model('Teacher');
  
  let teacherNotification = null;
  if (evaluation.teacherId) {
    try {
      const user = await User.findById(evaluation.teacherId);
      if (user) {
        const teacher = await Teacher.findOne({ email: user.email });
        if (teacher) {
          const teacherId = teacher._id || teacher.id;
          
          teacherNotification = await Notification.createOrUpdate({
            recipientId: mongoose.Types.ObjectId.isValid(teacherId) ? teacherId : new mongoose.Types.ObjectId(teacherId),
            recipientRole: 'teacher',
            type: 'weekly_evaluation_approved',
            entityType: 'weekly_evaluation',
            entityId,
            title: 'Weekly Evaluation Response Shared',
            message: `${reviewedByName || 'Admin'} has shared feedback on your weekly evaluation for ${studentName} (Week of ${weekStart}). ${adminFeedback ? adminFeedback.substring(0, 100) + '...' : ''}`,
            actionUrl: `/dashboard?evaluationId=${entityId}`,
            priority: 'high',
            createdBy: createdBy ? (mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : new mongoose.Types.ObjectId(createdBy)) : null,
            source: 'api',
            metadata: {
              studentId: evaluation.studentId,
              studentName,
              weekStartDate: evaluation.weekStartDate,
              adminFeedback
            }
          });
        }
      }
    } catch (error) {
      console.error('⚠️ Error creating teacher notification for weekly evaluation approval:', error);
      // Don't fail if teacher notification fails
    }
  }
  
  return [...adminNotifications, teacherNotification].filter(Boolean);
}

/**
 * Create notification for weekly evaluation feedback event
 * 
 * @param {Object} evaluation - Weekly evaluation document
 * @param {String} reviewedByName - Name of reviewer
 * @param {String} adminFeedback - Admin feedback
 * @param {ObjectId|String} createdBy - Who provided feedback (optional)
 * @returns {Promise<Array<Notification>>}
 */
async function notifyWeeklyEvaluationFeedback(evaluation, reviewedByName, adminFeedback, createdBy = null) {
  const entityId = mongoose.Types.ObjectId.isValid(evaluation.id || evaluation._id) 
    ? (evaluation.id || evaluation._id)
    : new mongoose.Types.ObjectId(evaluation.id || evaluation._id);
  
  const weekStart = new Date(evaluation.weekStartDate).toLocaleDateString();
  const studentName = evaluation.studentName || 'student';
  
  // Notify admin
  const adminNotifications = await Notification.createForAllAdmins({
    type: 'weekly_evaluation_feedback',
    entityType: 'weekly_evaluation',
    entityId,
    title: 'Evaluation Feedback Provided',
    message: `${reviewedByName || 'Admin'} provided feedback on weekly evaluation for ${studentName} (Week of ${weekStart})`,
    actionUrl: `/dashboard?evaluationId=${entityId}`,
    priority: 'normal',
    createdBy: createdBy ? (mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : new mongoose.Types.ObjectId(createdBy)) : null,
    source: 'api',
    metadata: {
      studentId: evaluation.studentId,
      studentName,
      weekStartDate: evaluation.weekStartDate,
      adminFeedback
    }
  });
  
  // Notify teacher
  const User = mongoose.model('User');
  const Teacher = mongoose.model('Teacher');
  
  let teacherNotification = null;
  if (evaluation.teacherId) {
    try {
      const user = await User.findById(evaluation.teacherId);
      if (user) {
        const teacher = await Teacher.findOne({ email: user.email });
        if (teacher) {
          const teacherId = teacher._id || teacher.id;
          
          teacherNotification = await Notification.createOrUpdate({
            recipientId: mongoose.Types.ObjectId.isValid(teacherId) ? teacherId : new mongoose.Types.ObjectId(teacherId),
            recipientRole: 'teacher',
            type: 'weekly_evaluation_feedback',
            entityType: 'weekly_evaluation',
            entityId,
            title: 'Weekly Evaluation Response Shared',
            message: `${reviewedByName || 'Admin'} has shared feedback on your weekly evaluation for ${studentName} (Week of ${weekStart}). ${adminFeedback ? adminFeedback.substring(0, 100) + '...' : ''}`,
            actionUrl: `/dashboard?evaluationId=${entityId}`,
            priority: 'normal',
            createdBy: createdBy ? (mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : new mongoose.Types.ObjectId(createdBy)) : null,
            source: 'api',
            metadata: {
              studentId: evaluation.studentId,
              studentName,
              weekStartDate: evaluation.weekStartDate,
              adminFeedback
            }
          });
        }
      }
    } catch (error) {
      console.error('⚠️ Error creating teacher notification for weekly evaluation feedback:', error);
      // Don't fail if teacher notification fails
    }
  }
  
  return [...adminNotifications, teacherNotification].filter(Boolean);
}

/**
 * Create notification for recitation review pending event
 * 
 * @param {Object} review - Recitation review document
 * @param {ObjectId|String} createdBy - Who created the review (optional)
 * @returns {Promise<Array<Notification>>}
 */
async function notifyRecitationReviewPending(review, createdBy = null) {
  const entityId = mongoose.Types.ObjectId.isValid(review._id) 
    ? review._id 
    : new mongoose.Types.ObjectId(review._id);
  
  const notificationData = {
    type: 'recitation_review_pending',
    entityType: 'recitation_review',
    entityId,
    title: 'New Recitation Review Pending',
    message: `${review.teacherName} submitted a ${review.recitationType} review for ${review.studentName}`,
    actionUrl: `/dashboard?reviewId=${entityId}`,
    priority: 'high',
    createdBy: createdBy ? (mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : new mongoose.Types.ObjectId(createdBy)) : null,
    source: 'api',
    metadata: {
      studentId: review.studentId,
      studentName: review.studentName,
      teacherId: review.teacherId,
      teacherName: review.teacherName,
      recitationType: review.recitationType
    }
  };
  
  // Notify all admins
  return Notification.createForAllAdmins(notificationData);
}

module.exports = {
  notifyTicketCreated,
  notifyTicketUpdated,
  notifyAssignmentSubmitted,
  notifyStudentEnrolled,
  notifyWeeklyEvaluationApproved,
  notifyWeeklyEvaluationFeedback,
  notifyRecitationReviewPending
};
