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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b-4 border-accent bg-gradient-to-br from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.9)] shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg">Create Ticket</h2>
              <p className="text-white mt-2 text-base sm:text-lg font-extrabold drop-shadow-md">
                {student?.fullName || 'Student'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-accent text-primary rounded-full transition-all text-3xl sm:text-4xl font-extrabold shadow-2xl hover:scale-110 hover:bg-accent/90 border-2 border-accent/50"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Reminder Alert for Previous Reports */}
        {showReminder && previousReports.length > 0 && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 sm:p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-2xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-yellow-800">
                  Previous {ticketType === 'sabqi' ? 'Sabqi' : 'Manzil'} Tickets Found
                </h3>
                <div className="mt-2 text-xs sm:text-sm text-yellow-700">
                  <p className="font-semibold">Last {previousReports.length} approved ticket(s) for this student:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {previousReports.slice(0, 3).map((report, idx) => (
                      <li key={report.id || idx} className="break-words">
                        {report.teacherComment || report.adminComment || 'No comment'} 
                        {report.sentAt && (
                          <span className="text-yellow-600 ml-2">
                            (Sent: {new Date(report.sentAt).toLocaleDateString()})
                          </span>
                        )}
                        {report.submittedAt && !report.sentAt && (
                          <span className="text-yellow-600 ml-2">
                            (Submitted: {new Date(report.submittedAt).toLocaleDateString()})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-medium">Please review to avoid creating duplicate tickets.</p>
                  <p className="mt-1 text-xs italic">
                    Note: These are tickets that were previously approved. Check the assignment page to see if they were saved.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReminder(false)}
                className="ml-2 sm:ml-4 text-yellow-600 hover:text-yellow-800 flex-shrink-0"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Ticket Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary mb-3">
              Ticket Type *
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setTicketType('sabq')}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border-2 font-extrabold text-sm sm:text-base transition-all shadow-lg hover:scale-105 ${
                  ticketType === 'sabq'
                    ? 'border-primary bg-soft-primary text-primary shadow-xl'
                    : 'border-accent-soft bg-white text-primary hover:border-primary hover:shadow-xl'
                }`}
              >
                Sabq
              </button>
              <button
                type="button"
                onClick={() => setTicketType('sabqi')}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border-2 font-extrabold text-sm sm:text-base transition-all shadow-lg hover:scale-105 ${
                  ticketType === 'sabqi'
                    ? 'border-primary bg-soft-primary text-primary shadow-xl'
                    : 'border-accent-soft bg-white text-primary hover:border-primary hover:shadow-xl'
                }`}
              >
                Sabqi
              </button>
              <button
                type="button"
                onClick={() => setTicketType('manzil')}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border-2 font-extrabold text-sm sm:text-base transition-all shadow-lg hover:scale-105 ${
                  ticketType === 'manzil'
                    ? 'border-primary bg-soft-primary text-primary shadow-xl'
                    : 'border-accent-soft bg-white text-primary hover:border-primary hover:shadow-xl'
                }`}
              >
                Manzil
              </button>
            </div>
            {ticketType === 'sabq' && (
              <p className="mt-2 text-xs sm:text-sm text-primary-soft">
                Sabq tickets go directly to assignment page (admin only, no teacher review)
              </p>
            )}
            {(ticketType === 'sabqi' || ticketType === 'manzil') && (
              <p className="mt-2 text-xs sm:text-sm text-primary-soft">
                {ticketType === 'sabqi' ? 'Sabqi' : 'Manzil'} tickets require teacher review before assignment
              </p>
            )}
          </div>

          {/* Admin Comment (for sabq) */}
          {ticketType === 'sabq' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-primary mb-2">
                Comment *
              </label>
              <textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Enter comment for sabq assignment..."
                rows={4}
                className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition"
                required
              />
            </div>
          )}

          {/* Teacher Selection (for sabqi/manzil) */}
          {(ticketType === 'sabqi' || ticketType === 'manzil') && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-primary mb-2">
                  Select Teacher *
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition"
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
                <label className="block text-sm font-medium text-primary mb-2">
                  Notes for Teacher *
                </label>
                <textarea
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Enter notes or instructions for the teacher..."
                  rows={4}
                  className="w-full px-3 py-2 border border-accent-soft rounded-2xl bg-white text-primary focus:ring-2 focus:ring-primary focus:border-primary transition"
                  required
                />
              </div>
            </>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-accent-soft">
            <button
              type="button"
              onClick={onClose}
              className="px-7 py-3 border-2 border-accent-soft text-primary rounded-full font-extrabold hover:bg-soft-accent transition-all shadow-lg hover:scale-105"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-primary text-white rounded-full font-extrabold hover:bg-[rgba(var(--color-primary-rgb),0.85)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:scale-110"
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketCreationForm;

