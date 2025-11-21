import React, { useState, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import { Ticket, TicketType } from '../types/ticket';

interface TicketCreationFormProps {
  studentId: string;
  onClose: () => void;
  onSuccess: (ticket: Ticket) => void;
}

const TicketCreationForm: React.FC<TicketCreationFormProps> = ({
  studentId,
  onClose,
  onSuccess
}) => {
  const { students, teachers, createTicket, getPreviousReports } = useBackendData();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [ticketType, setTicketType] = useState<TicketType | ''>('');
  const [adminComment, setAdminComment] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [previousReports, setPreviousReports] = useState<Ticket[]>([]);
  const [showReminder, setShowReminder] = useState(false);

  const student = students.find(s => s.id === studentId);

  // Load previous reports when sabqi or manzil is selected
  useEffect(() => {
    if ((ticketType === 'sabqi' || ticketType === 'manzil') && studentId) {
      getPreviousReports(studentId, ticketType).then(reports => {
        console.log('📋 Previous reports found:', reports.length, reports);
        setPreviousReports(reports);
        if (reports.length > 0) {
          setShowReminder(true);
        }
      }).catch(err => {
        console.error('Error loading previous reports:', err);
        setPreviousReports([]);
        setShowReminder(false);
      });
    } else {
      setPreviousReports([]);
      setShowReminder(false);
    }
  }, [ticketType, studentId, getPreviousReports]);

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

    // For sabq, adminComment is required
    if (ticketType === 'sabq' && !adminComment.trim()) {
      alert('Please enter a comment for sabq');
      return;
    }

    // For sabqi/manzil, teacher selection and notes are required
    if ((ticketType === 'sabqi' || ticketType === 'manzil') && !selectedTeacherId) {
      alert('Please select a teacher');
      return;
    }

    setIsCreating(true);
    try {
      const ticketData: Partial<Ticket> = {
        studentId: student.id,
        studentName: student.fullName,
        type: ticketType,
        status: ticketType === 'sabq' ? 'sent_to_assignment' : 'pending',
        createdBy: user.id || '',
        createdByName: user.name || user.email || 'Unknown',
        adminComment: adminComment.trim(),
        assignedTeacherId: ticketType !== 'sabq' ? selectedTeacherId : undefined,
        assignedTeacherName: ticketType !== 'sabq' 
          ? teachers.find(t => t.id === selectedTeacherId)?.fullName || ''
          : undefined,
        teacherNotes: ticketType !== 'sabq' ? teacherNotes.trim() : undefined
      };

      const newTicket = await createTicket(ticketData);
      
      // If sabq, immediately send to assignment (pre-fill)
      if (ticketType === 'sabq') {
        onSuccess(newTicket);
      } else {
        onSuccess(newTicket);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border-4 border-accent/30">
        {/* Modern Header */}
        <div className="px-6 sm:px-8 py-5 sm:py-6 border-b-4 border-accent/50 bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-white">TK</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg truncate">Create New Ticket</h2>
                <p className="text-white/90 mt-1 text-sm sm:text-base md:text-lg font-bold truncate">
                  {student?.fullName || 'Student'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all hover:scale-110 text-xl sm:text-2xl md:text-3xl font-bold shadow-lg border-2 border-white/30 touch-target flex-shrink-0"
              title="Close"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Reminder Alert for Previous Reports */}
        {showReminder && previousReports.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-yellow-800 mb-2 uppercase tracking-wide">
                    Previous {ticketType === 'sabqi' ? 'Sabqi' : 'Manzil'} Tickets Found
                  </h3>
                  <div className="text-xs sm:text-sm text-yellow-900">
                    <p className="font-bold mb-2">Last {previousReports.length} approved ticket(s) for this student:</p>
                    <ul className="list-disc list-inside space-y-1 mb-3">
                      {previousReports.slice(0, 3).map((report, idx) => (
                        <li key={report.id || idx} className="break-words">
                          {report.teacherComment || report.adminComment || 'No comment'} 
                          {report.sentAt && (
                            <span className="text-yellow-700 ml-2 font-semibold">
                              (Sent: {new Date(report.sentAt).toLocaleDateString()})
                            </span>
                          )}
                          {report.submittedAt && !report.sentAt && (
                            <span className="text-yellow-700 ml-2 font-semibold">
                              (Submitted: {new Date(report.submittedAt).toLocaleDateString()})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="font-bold">Please review to avoid creating duplicate tickets.</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowReminder(false)}
                className="ml-4 text-yellow-600 hover:text-yellow-800 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-yellow-100 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          {/* Ticket Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-extrabold text-primary mb-4 uppercase tracking-wide">
              Select Ticket Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTicketType('sabq')}
                className={`px-4 py-5 rounded-xl border-2 font-extrabold text-sm transition-all shadow-lg hover:scale-105 ${
                  ticketType === 'sabq'
                    ? 'border-green-500 bg-green-50 text-green-700 shadow-xl ring-2 ring-green-200'
                    : 'border-gray-300 bg-white text-primary hover:border-green-400 hover:shadow-xl'
                }`}
              >
                <div className="text-2xl mb-1">📖</div>
                <div>Sabq</div>
              </button>
              <button
                type="button"
                onClick={() => setTicketType('sabqi')}
                className={`px-4 py-5 rounded-xl border-2 font-extrabold text-sm transition-all shadow-lg hover:scale-105 ${
                  ticketType === 'sabqi'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-xl ring-2 ring-blue-200'
                    : 'border-gray-300 bg-white text-primary hover:border-blue-400 hover:shadow-xl'
                }`}
              >
                <div className="text-2xl mb-1">📚</div>
                <div>Sabqi</div>
              </button>
              <button
                type="button"
                onClick={() => setTicketType('manzil')}
                className={`px-4 py-5 rounded-xl border-2 font-extrabold text-sm transition-all shadow-lg hover:scale-105 ${
                  ticketType === 'manzil'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-xl ring-2 ring-purple-200'
                    : 'border-gray-300 bg-white text-primary hover:border-purple-400 hover:shadow-xl'
                }`}
              >
                <div className="text-2xl mb-1">📿</div>
                <div>Manzil</div>
              </button>
            </div>
            {ticketType === 'sabq' && (
              <p className="mt-3 text-xs text-primary/70 font-medium bg-green-50 p-2 rounded-lg border border-green-200">
                📝 Sabq tickets go directly to assignment page (admin only, no teacher review)
              </p>
            )}
            {(ticketType === 'sabqi' || ticketType === 'manzil') && (
              <p className="mt-3 text-xs text-primary/70 font-medium bg-blue-50 p-2 rounded-lg border border-blue-200">
                👨‍🏫 {ticketType === 'sabqi' ? 'Sabqi' : 'Manzil'} tickets require teacher review before assignment
              </p>
            )}
          </div>

          {/* Admin Comment (for sabq) */}
          {ticketType === 'sabq' && (
            <div className="mb-6">
              <label className="block text-sm font-extrabold text-primary mb-2 uppercase tracking-wide">
                Comment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Enter comment for sabq assignment..."
                rows={5}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition font-medium shadow-sm resize-none"
                required
              />
            </div>
          )}

          {/* Teacher Selection (for sabqi/manzil) */}
          {(ticketType === 'sabqi' || ticketType === 'manzil') && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-extrabold text-primary mb-2 uppercase tracking-wide">
                  Select Teacher <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition font-medium shadow-sm"
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

              <div className="mb-6">
                <label className="block text-sm font-extrabold text-primary mb-2 uppercase tracking-wide">
                  Notes for Teacher <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Enter notes or instructions for the teacher..."
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition font-medium shadow-sm resize-none"
                  required
                />
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-primary rounded-xl font-extrabold hover:bg-gray-50 transition-all shadow-md"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-8 py-4 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-extrabold hover:from-primary/90 hover:to-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Create Ticket</span>
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

