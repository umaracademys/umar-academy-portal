import React, { useState, useMemo } from 'react';
import { Ticket } from '../types/ticket';
import { useBackendData } from '../contexts/BackendDataContext';

interface ActiveTicketsManagementProps {
  onClose: () => void;
}

const ActiveTicketsManagement: React.FC<ActiveTicketsManagementProps> = ({ onClose }) => {
  const { recitationTickets, deleteTicket, updateRecitationTicket, refreshData } = useBackendData();
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editForm, setEditForm] = useState<Partial<Ticket>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter active tickets (not sent_to_assignment)
  const activeTickets = useMemo(() => {
    return recitationTickets.filter(ticket => {
      const isActive = ticket.status !== 'sent_to_assignment';
      const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
      const matchesSearch = searchTerm === '' || 
        ticket.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.assignedTeacherName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return isActive && matchesStatus && matchesSearch;
    }).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
  }, [recitationTickets, filterStatus, searchTerm]);

  const handleDelete = async (ticket: Ticket) => {
    if (confirm(`Are you sure you want to delete this ticket for ${ticket.studentName}?`)) {
      try {
        await deleteTicket(ticket.id);
        await refreshData();
      } catch (error) {
        console.error('Error deleting ticket:', error);
        alert('Failed to delete ticket: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setEditForm({
      studentName: ticket.studentName,
      type: ticket.type,
      status: ticket.status,
      teacherNotes: ticket.teacherNotes,
      assignedTeacherName: ticket.assignedTeacherName,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTicket) return;
    
    try {
      await updateRecitationTicket(editingTicket.id, editForm);
      setEditingTicket(null);
      setEditForm({});
      await refreshData();
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Failed to update ticket: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleCancelEdit = () => {
    setEditingTicket(null);
    setEditForm({});
  };

  const statusOptions = ['all', 'pending', 'in_progress', 'submitted', 'reassigned'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Active Tickets Management</h2>
            <p className="text-sm text-gray-600 mt-1">View, edit, and delete all active tickets</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by student name, type, or teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Showing {activeTickets.length} active ticket(s)
          </div>
        </div>

        {/* Tickets List */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTickets.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No active tickets found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {editingTicket?.id === ticket.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                          <input
                            type="text"
                            value={editForm.studentName || ''}
                            onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={editForm.type || ''}
                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="sabq">Sabq</option>
                            <option value="sabqi">Sabqi</option>
                            <option value="manzil">Manzil</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={editForm.status || ''}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="submitted">Submitted</option>
                            <option value="reassigned">Reassigned</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Teacher</label>
                          <input
                            type="text"
                            value={editForm.assignedTeacherName || ''}
                            onChange={(e) => setEditForm({ ...editForm, assignedTeacherName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Notes</label>
                        <textarea
                          value={editForm.teacherNotes || ''}
                          onChange={(e) => setEditForm({ ...editForm, teacherNotes: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            ticket.type === 'sabqi' ? 'bg-primary/20 text-primary' :
                            ticket.type === 'manzil' ? 'bg-accent/20 text-accent' :
                            'bg-primary/20 text-primary'
                          }`}>
                            {ticket.type?.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            ticket.status === 'submitted' ? 'bg-green-100 text-green-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {ticket.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{ticket.studentName}</h3>
                        {ticket.assignedTeacherName && (
                          <p className="text-sm text-gray-600 mb-2">Assigned to: {ticket.assignedTeacherName}</p>
                        )}
                        {ticket.teacherNotes && (
                          <p className="text-sm text-gray-700 mb-2">{ticket.teacherNotes}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Created: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(ticket)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(ticket)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveTicketsManagement;

