/**
 * Batch Query Helpers
 * 
 * Utilities to eliminate N+1 query problems by batching database queries
 */

const mongoose = require('mongoose');

/**
 * Batch fetch tickets by IDs
 * Replaces individual findTicketById calls with single bulk query
 */
async function batchFindTickets(ticketIds) {
  if (!ticketIds || ticketIds.length === 0) {
    return new Map();
  }

  const Ticket = mongoose.models.Ticket || mongoose.model('Ticket');
  
  // Filter valid ObjectIds and string IDs
  const validIds = ticketIds.filter(id => id);
  if (validIds.length === 0) {
    return new Map();
  }

  // Convert all IDs to ObjectIds where possible
  const objectIds = [];
  const stringIds = [];
  
  validIds.forEach(id => {
    const idStr = String(id);
    if (mongoose.Types.ObjectId.isValid(idStr)) {
      objectIds.push(new mongoose.Types.ObjectId(idStr));
      objectIds.push(idStr); // Also try as string
    } else {
      stringIds.push(idStr);
    }
  });

  // Build query
  const query = {
    $or: [
      { _id: { $in: objectIds } },
      { id: { $in: [...objectIds.map(id => id.toString()), ...stringIds] } }
    ]
  };

  // Execute single bulk query
  const tickets = await Ticket.find(query).lean();
  
  // Create map for O(1) lookup
  const ticketMap = new Map();
  tickets.forEach(ticket => {
    // Index by _id
    if (ticket._id) {
      ticketMap.set(ticket._id.toString(), ticket);
    }
    // Index by id field
    if (ticket.id) {
      ticketMap.set(String(ticket.id), ticket);
    }
  });

  return ticketMap;
}

/**
 * Batch update teachers' assignedStudents arrays
 * Replaces individual findByIdAndUpdate calls with bulk update
 */
async function batchUpdateTeacherAssignedStudents(updates) {
  if (!updates || updates.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const Teacher = mongoose.models.Teacher || mongoose.model('Teacher');
  
  // Group updates by teacher ID
  const teacherUpdates = new Map();
  
  updates.forEach(({ teacherId, studentId }) => {
    if (!teacherUpdates.has(teacherId)) {
      teacherUpdates.set(teacherId, new Set());
    }
    teacherUpdates.get(teacherId).add(studentId);
  });

  // Execute bulk operations
  const bulkOps = [];
  for (const [teacherId, studentIds] of teacherUpdates.entries()) {
    const studentIdArray = Array.from(studentIds);
    bulkOps.push({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(teacherId) },
        update: { $addToSet: { assignedStudents: { $each: studentIdArray } } }
      }
    });
  }

  if (bulkOps.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const result = await Teacher.bulkWrite(bulkOps);
  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount
  };
}

/**
 * Batch save assignments
 * Replaces individual save() calls with bulk write
 */
async function batchSaveAssignments(assignments) {
  if (!assignments || assignments.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const Assignment = mongoose.models.Assignment || mongoose.model('Assignment');
  
  // Filter only modified assignments
  const modifiedAssignments = assignments.filter(a => {
    if (typeof a.isModified === 'function') {
      return a.isModified();
    }
    // If it's a plain object, assume it's modified if it has _id
    return a._id || a.id;
  });

  if (modifiedAssignments.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  // Prepare bulk operations
  const bulkOps = modifiedAssignments.map(assignment => {
    const assignmentData = assignment.toObject ? assignment.toObject() : assignment;
    const id = assignment._id || assignment.id;
    
    // Remove _id for update
    delete assignmentData._id;
    delete assignmentData.__v;
    
    assignmentData.updatedAt = new Date();
    
    return {
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: assignmentData }
      }
    };
  });

  const result = await Assignment.bulkWrite(bulkOps);
  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount
  };
}

module.exports = {
  batchFindTickets,
  batchUpdateTeacherAssignedStudents,
  batchSaveAssignments
};
