/**
 * Field Mapping Utilities
 * 
 * Phase 3: Production Stabilization
 * Handles field name normalization and validation for Student/Teacher assignments
 */

/**
 * Normalize student assignment fields
 * Handles legacy fields (assignedTeacher, assignedTeacherId) and new fields (assignedTeachers, assignedTeacherIds)
 * 
 * @param {Object} studentData - Student data object
 * @returns {Object} Normalized student data
 */
function normalizeStudentAssignmentFields(studentData) {
  const normalized = { ...studentData };
  
  // Collect all teacher IDs from various field names
  const teacherIds = new Set();
  
  // New fields (preferred)
  if (Array.isArray(normalized.assignedTeacherIds)) {
    normalized.assignedTeacherIds.forEach(id => {
      if (id && typeof id === 'string') teacherIds.add(id.trim());
    });
  }
  if (Array.isArray(normalized.assignedTeachers)) {
    normalized.assignedTeachers.forEach(id => {
      if (id && typeof id === 'string') teacherIds.add(id.trim());
    });
  }
  
  // Legacy fields (for backward compatibility)
  if (normalized.assignedTeacherId && typeof normalized.assignedTeacherId === 'string') {
    teacherIds.add(normalized.assignedTeacherId.trim());
  }
  if (normalized.assignedTeacher && typeof normalized.assignedTeacher === 'string') {
    teacherIds.add(normalized.assignedTeacher.trim());
  }
  
  // Set all fields consistently
  const teacherIdsArray = Array.from(teacherIds);
  normalized.assignedTeacherIds = teacherIdsArray;
  normalized.assignedTeachers = teacherIdsArray;
  
  // Keep legacy fields for backward compatibility (set to first teacher)
  if (teacherIdsArray.length > 0) {
    normalized.assignedTeacherId = teacherIdsArray[0];
    normalized.assignedTeacher = teacherIdsArray[0];
  } else {
    normalized.assignedTeacherId = undefined;
    normalized.assignedTeacher = undefined;
  }
  
  return normalized;
}

/**
 * Validate and log field mismatches
 * 
 * @param {Object} student - Student object
 * @param {String} operation - Operation type (save, update, etc.)
 * @returns {Array} Array of warning messages
 */
function validateStudentFields(student, operation = 'save') {
  const warnings = [];
  
  // Check for field inconsistencies
  if (student.assignedTeacherId && !student.assignedTeacherIds?.includes(student.assignedTeacherId)) {
    warnings.push('assignedTeacherId not in assignedTeacherIds array');
  }
  
  if (student.assignedTeacher && !student.assignedTeachers?.includes(student.assignedTeacher)) {
    warnings.push('assignedTeacher not in assignedTeachers array');
  }
  
  if (warnings.length > 0) {
    console.warn(`⚠️ Student field inconsistencies (${operation}):`, {
      studentId: student._id || student.id,
      studentName: student.fullName,
      warnings
    });
  }
  
  return warnings;
}

module.exports = {
  normalizeStudentAssignmentFields,
  validateStudentFields
};
