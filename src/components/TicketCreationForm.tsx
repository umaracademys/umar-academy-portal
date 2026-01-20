import React, { useState, useEffect, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Ticket, TicketType } from '../types/ticket';

interface TicketCreationFormProps {
  studentId?: string; // Optional - if not provided, show student selector
  onClose: () => void;
  onSuccess: (ticket: Ticket, openSabqReview?: boolean) => void;
  ticket?: Ticket; // Optional ticket for editing mode
}

const TicketCreationForm: React.FC<TicketCreationFormProps> = ({
  studentId,
  onClose,
  onSuccess,
  ticket: existingTicket
}) => {
  const { students, teachers, createTicket, updateRecitationTicket, assignments, getStudentAssignments, getStudentsByTeacher } = useBackendData();
  const { user } = useAuth();
  const isEditMode = !!existingTicket;
  const isTeacher = user?.role === 'teacher';
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(studentId || '');
  const [ticketType, setTicketType] = useState<TicketType | ''>(existingTicket?.type || '');
  const [adminComment, setAdminComment] = useState(existingTicket?.adminComment || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState(existingTicket?.assignedTeacherId || '');
  const [teacherNotes, setTeacherNotes] = useState(existingTicket?.teacherNotes || '');
  // Get available students - teachers can now create tickets for all students
  const availableStudents = React.useMemo(() => {
    // All users (teachers and admins) can see all students
    return students;
  }, [students]);

  const student = availableStudents.find(s => s.id === selectedStudentId);

  // Get recent homework assignments from latest date only
  const previousDayHomework = useMemo(() => {
    if (!studentId) return [];
    
    const studentAssignments = getStudentAssignments(studentId);
    
    // Filter assignments with homework
    const assignmentsWithHomework = studentAssignments
      .filter((assignment: any) => {
        // Check if assignment has homework (either new format with items or legacy format with content)
        const hasNewFormatHomework = assignment.homework?.enabled && assignment.homework?.items?.length > 0;
        const hasLegacyHomework = assignment.homework?.enabled && assignment.homework?.content;
        
        if (!hasNewFormatHomework && !hasLegacyHomework) return false;
        
        const assignmentDate = assignment.createdAt ? new Date(assignment.createdAt) : null;
        return assignmentDate !== null;
      })
      .map((assignment: any) => {
        const assignmentDate = assignment.createdAt ? new Date(assignment.createdAt) : null;
        const dateStr = assignmentDate ? assignmentDate.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }) : 'Unknown';
        
        // Handle both new format (items) and legacy format (content)
        const homeworkItems = assignment.homework?.items || [];
        const legacyContent = assignment.homework?.content;
        
        return {
          id: assignment.id || assignment._id,
          date: dateStr,
          fullDate: assignmentDate,
          homeworkItems: homeworkItems,
          legacyContent: legacyContent,
          notes: assignment.homework?.notes || '',
          assignedBy: assignment.assignedByName || 'Unknown'
        };
      })
      .sort((a: any, b: any) => {
        const dateA = a.fullDate ? a.fullDate.getTime() : 0;
        const dateB = b.fullDate ? b.fullDate.getTime() : 0;
        return dateB - dateA; // Most recent first
      });
    
    // If no assignments, return empty array
    if (assignmentsWithHomework.length === 0) return [];
    
    // Get the latest date (first item after sorting)
    const latestDate = assignmentsWithHomework[0].fullDate;
    if (!latestDate) return [];
    
    // Normalize latest date to midnight for comparison
    const latestDateNormalized = new Date(latestDate);
    latestDateNormalized.setHours(0, 0, 0, 0);
    
    // Filter to only show homework from the latest date
    return assignmentsWithHomework.filter((hw: any) => {
      if (!hw.fullDate) return false;
      const hwDateNormalized = new Date(hw.fullDate);
      hwDateNormalized.setHours(0, 0, 0, 0);
      return hwDateNormalized.getTime() === latestDateNormalized.getTime();
    });
  }, [studentId, assignments, getStudentAssignments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!student || !user) {
      alert('Student or user information is missing');
      return;
    }

    if (!ticketType) {
      alert('Please select a ticket type');
      return;
    }

    // For sabq, adminComment is optional (will be added in AdminSabqReview)
    // No validation needed here for Sabq tickets

    // For teachers creating sabqi/manzil tickets, teacher is auto-assigned (backend handles this)
    // For admins, teacher selection is required
    if (!isTeacher && (ticketType === 'sabqi' || ticketType === 'manzil') && !selectedTeacherId) {
      alert('Please select a teacher');
      return;
    }

    setIsCreating(true);
    try {
      const ticketData: Partial<Ticket> = {
        studentId: student.id,
        studentName: student.fullName,
        type: ticketType,
        // For Sabq, adminComment will be added in AdminSabqReview
        // For other types, adminComment is required
        adminComment: ticketType === 'sabq' ? (adminComment.trim() || '') : adminComment.trim(),
        assignedTeacherId: ticketType !== 'sabq' ? selectedTeacherId : undefined,
        assignedTeacherName: ticketType !== 'sabq' 
          ? teachers.find(t => t.id === selectedTeacherId)?.fullName || ''
          : undefined,
        teacherNotes: ticketType !== 'sabq' ? teacherNotes.trim() : undefined
      };

      let updatedTicket: Ticket;
      
      if (isEditMode && existingTicket) {
        // Update existing ticket (preserve status unless it's pending/in_progress)
        if (existingTicket.status === 'pending' || existingTicket.status === 'in_progress') {
          // For Sabq, keep as pending (admin needs to review)
          ticketData.status = 'pending';
        }
        updatedTicket = await updateRecitationTicket(existingTicket.id, ticketData);
      } else {
        // Create new ticket
        // For Sabq, set to pending so admin can review with Interactive Mushaf
        // For sabqi/manzil, set to pending for teacher assignment
        ticketData.status = 'pending';
        ticketData.createdBy = user.id || '';
        ticketData.createdByName = user.name || user.email || 'Unknown';
        
        // For teachers, don't set assignedTeacherId here - backend will auto-assign
        if (isTeacher && (ticketType === 'sabqi' || ticketType === 'manzil')) {
          // Backend will auto-assign the teacher
          ticketData.assignedTeacherId = undefined;
          ticketData.assignedTeacherName = undefined;
        }
        
        updatedTicket = await createTicket(ticketData);
      }
      
      // Pass the ticket and whether it should open Sabq review
      onSuccess(updatedTicket, ticketType === 'sabq' && !isEditMode);
      onClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} ticket:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} ticket. Please try again.`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-200">
        {/* Elegant Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-primary via-primary/95 to-primary/90 border-b border-primary/20">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
                <span className="text-xl font-bold text-white">🎫</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-0.5">
                  {isEditMode ? 'Edit Ticket' : 'Create New Ticket'}
                </h2>
                <p className="text-white/80 text-sm font-medium">
                  {student?.fullName || 'Student'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all hover:scale-110 text-xl font-semibold border border-white/20"
              title="Close"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Assignment History - Compact & Modern */}
        {previousDayHomework.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-gradient-to-br from-slate-50 to-primary/5 border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm">📚</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Recent Homework History</h3>
                <p className="text-xs text-slate-500">Reference previous assignments</p>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {previousDayHomework.slice(0, 5).map((hw, idx) => (
                <div key={hw.id || idx} className="bg-white rounded-lg p-2.5 border border-slate-200 hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-700">{hw.date}</span>
                    {hw.assignedBy && hw.assignedBy !== 'Unknown' && (
                      <span className="text-xs text-slate-400">by {hw.assignedBy}</span>
                    )}
                  </div>
                  {hw.homeworkItems.length > 0 ? (
                    <div className="space-y-1">
                      {hw.homeworkItems.slice(0, 2).map((item: any, itemIdx: number) => {
                        const getRangeText = () => {
                          if (item.range?.mode === 'surah_ayah' && item.range.from?.surah) {
                            const fromSurah = item.range.from.surah;
                            const toSurah = item.range.to?.surah || fromSurah;
                            const fromAyah = item.range.from.ayah;
                            const toAyah = item.range.to?.ayah;
                            
                            if (fromSurah === toSurah) {
                              if (fromAyah && toAyah) {
                                return `Surah ${fromSurah}:${fromAyah}-${toAyah}`;
                              } else if (fromAyah) {
                                return `Surah ${fromSurah}:${fromAyah}`;
                              } else {
                                return `Surah ${fromSurah}`;
                              }
                            } else {
                              return `Surah ${fromSurah} to ${toSurah}`;
                            }
                          }
                          if (item.range?.mode === 'surah_surah' && item.range.from?.surah && item.range.to?.surah) {
                            return `Surah ${item.range.from.surah} - ${item.range.to.surah}`;
                          }
                          if ((item.range?.mode === 'juz_juz' || item.range?.mode === 'multiple_juz') && item.range.juzList?.length > 0) {
                            return `Juz ${item.range.juzList.sort((a: number, b: number) => a - b).join(', ')}`;
                          }
                          return 'No range specified';
                        };
                        
                        return (
                          <div key={itemIdx} className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 mb-1">
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-primary capitalize">{item.type}:</span>
                              <span>{getRangeText()}</span>
                            </div>
                            {item.content && item.content.trim() && (
                              <div className="mt-1 pt-1 border-t border-slate-200">
                                <span className="text-slate-500 italic text-[10px]">Instructions: </span>
                                <span className="text-slate-600">{item.content}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : hw.legacyContent ? (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 whitespace-pre-wrap">
                      <div className="line-clamp-2">{hw.legacyContent}</div>
                      {hw.notes && hw.notes.trim() && (
                        <div className="mt-1 pt-1 border-t border-slate-200">
                          <span className="text-slate-500 italic text-[10px]">Notes: </span>
                          <span className="text-slate-600">{hw.notes}</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {hw.notes && hw.notes.trim() && !hw.homeworkItems.length && !hw.legacyContent && (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 mt-1">
                      <span className="text-slate-500 italic text-[10px]">Notes: </span>
                      <span className="text-slate-600">{hw.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-white">
          {/* Student Selection - Show if studentId not provided (for teachers) */}
          {!studentId && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Student <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
                required
              >
                <option value="">Choose a student...</option>
                {availableStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} {s.program ? `- ${s.program}` : ''}
                  </option>
                ))}
              </select>
              {isTeacher && availableStudents.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  No students assigned to you. Contact admin to get students assigned.
                </p>
              )}
            </div>
          )}

          {/* Ticket Type Selection - Modern Card Design */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Ticket Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={async () => {
                  setTicketType('sabq');
                  // If student is selected and not in edit mode, auto-create ticket and open review
                  if (selectedStudentId && !isEditMode && user && !isTeacher) {
                    const selectedStudent = availableStudents.find(s => s.id === selectedStudentId);
                    if (selectedStudent) {
                      try {
                        setIsCreating(true);
                        const ticketData: Partial<Ticket> = {
                          studentId: selectedStudent.id,
                          studentName: selectedStudent.fullName,
                          type: 'sabq',
                          status: 'pending',
                          adminComment: '',
                          createdBy: user.id || '',
                          createdByName: user.name || user.email || 'Unknown'
                        };
                        const newTicket = await createTicket(ticketData);
                        // Open AdminSabqReview with the new ticket
                        onSuccess(newTicket, true);
                        onClose();
                      } catch (error) {
                        console.error('Error creating Sabq ticket:', error);
                        alert('Failed to create Sabq ticket. Please try again.');
                        setIsCreating(false);
                      }
                    }
                  }
                }}
                className={`group relative px-4 py-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${
                  ticketType === 'sabq'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm'
                }`}
              >
                <div className="text-2xl mb-1.5">📖</div>
                <div className="font-semibold">Sabq</div>
                {ticketType === 'sabq' && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full"></div>
                )}
              </button>
              <button
                type="button"
                onClick={() => setTicketType('sabqi')}
                className={`group relative px-4 py-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${
                  ticketType === 'sabqi'
                    ? 'border-primary bg-primary/10 text-primary shadow-md ring-2 ring-primary/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm'
                }`}
              >
                <div className="text-2xl mb-1.5">📚</div>
                <div className="font-semibold">Sabqi</div>
                {ticketType === 'sabqi' && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></div>
                )}
              </button>
              <button
                type="button"
                onClick={() => setTicketType('manzil')}
                className={`group relative px-4 py-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${
                  ticketType === 'manzil'
                    ? 'border-accent bg-accent/10 text-accent shadow-md ring-2 ring-accent/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-accent/50 hover:bg-accent/5 hover:shadow-sm'
                }`}
              >
                <div className="text-2xl mb-1.5">📿</div>
                <div className="font-semibold">Manzil</div>
                {ticketType === 'manzil' && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full"></div>
                )}
              </button>
            </div>
            {ticketType === 'sabq' && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs text-emerald-700 font-medium">
                  📝 Goes directly to assignment page (no teacher review required)
                </p>
              </div>
            )}
            {(ticketType === 'sabqi' || ticketType === 'manzil') && (
              <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-xs text-primary font-medium">
                  👨‍🏫 Requires teacher review before assignment
                </p>
              </div>
            )}
          </div>

          {/* Form Fields - Clean Design */}
          {ticketType === 'sabq' && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Comment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm resize-none placeholder:text-slate-400"
                placeholder="Enter comment for sabq assignment..."
              />
            </div>
          )}

          {(ticketType === 'sabqi' || ticketType === 'manzil') && (
            <div className="space-y-5">
              {/* Teacher Selection - Only show for admins */}
              {!isTeacher && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Teacher <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
                    required
                  >
                    <option value="">Choose a teacher...</option>
                    {teachers
                      .filter(t => t.status === 'active')
                      .map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.fullName}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Notes - For teachers, this is their own notes. For admins, notes for teacher */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isTeacher ? 'Notes' : 'Notes for Teacher'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm resize-none placeholder:text-slate-400"
                  placeholder={isTeacher ? "Enter your notes about this recitation..." : "Enter notes or instructions for the teacher..."}
                  required={!isTeacher}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-6 -mb-6 px-6 py-4 mt-6 flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>{isEditMode ? 'Update Ticket' : 'Create Ticket'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketCreationForm;

