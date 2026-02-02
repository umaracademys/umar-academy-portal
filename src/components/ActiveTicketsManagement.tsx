import React, { useState, useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import { Ticket } from '../types/ticket';
import { useBackendData } from '../contexts/BackendDataContext';
import Button from './ui/Button';

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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      all: 'All',
      pending: 'Waiting for reply',
      in_progress: 'In progress',
      submitted: 'Submitted',
      reassigned: 'Reassigned'
    };
    return labels[status] || status.replace('_', ' ');
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="heading-page">Tickets</h2>
            <p className="caption mt-1 text-gray-600">View and manage active tickets</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="min-w-[44px] min-h-[44px] p-0 text-gray-500 hover:text-gray-700">
            <span className="sr-only">Close</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by student, type, or teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="caption text-gray-600">
            {activeTickets.length} ticket{activeTickets.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Tickets List */}
        <div className="flex-1 overflow-hidden p-6">
          {activeTickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="body-text text-gray-700">No tickets yet</p>
              <p className="caption mt-1 text-gray-600">New tickets will appear here</p>
            </div>
          ) : (
            // ✅ PHASE 2 OPTIMIZATION: Use virtualization for large lists (80-95% DOM node reduction)
            <FixedSizeList
              height={600}
              itemCount={activeTickets.length}
              itemSize={140} // Approximate height of each ticket card
              width="100%"
              itemData={{
                tickets: activeTickets,
                editingTicket,
                editForm,
                onEdit: handleEdit,
                onDelete: handleDelete,
                onSaveEdit: handleSaveEdit,
                onCancelEdit: handleCancelEdit,
                setEditForm
              }}
              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            >
              {({ index, style, data }) => {
                const ticket = data.tickets[index];
                const isEditing = data.editingTicket?.id === ticket.id;
                
                return (
                  <div style={style} className="px-2">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 h-full">
                      {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block body-text font-medium text-gray-700 mb-1">Student</label>
                          <input
                            type="text"
                                value={data.editForm.studentName || ''}
                                onChange={(e) => data.setEditForm({ ...data.editForm, studentName: e.target.value })}
                            className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block body-text font-medium text-gray-700 mb-1">Type</label>
                          <select
                                value={data.editForm.type || ''}
                                onChange={(e) => data.setEditForm({ ...data.editForm, type: e.target.value as any })}
                            className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          >
                            <option value="sabq">Sabq</option>
                            <option value="sabqi">Sabqi</option>
                            <option value="manzil">Manzil</option>
                          </select>
                        </div>
                        <div>
                          <label className="block body-text font-medium text-gray-700 mb-1">Status</label>
                          <select
                                value={data.editForm.status || ''}
                                onChange={(e) => data.setEditForm({ ...data.editForm, status: e.target.value as any })}
                            className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          >
                            <option value="pending">Waiting for reply</option>
                            <option value="in_progress">In progress</option>
                            <option value="submitted">Submitted</option>
                            <option value="reassigned">Reassigned</option>
                          </select>
                        </div>
                        <div>
                          <label className="block body-text font-medium text-gray-700 mb-1">Assigned teacher</label>
                          <input
                            type="text"
                                value={data.editForm.assignedTeacherName || ''}
                                onChange={(e) => data.setEditForm({ ...data.editForm, assignedTeacherName: e.target.value })}
                            className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block body-text font-medium text-gray-700 mb-1">Teacher notes</label>
                        <textarea
                              value={data.editForm.teacherNotes || ''}
                              onChange={(e) => data.setEditForm({ ...data.editForm, teacherNotes: e.target.value })}
                          rows={3}
                          className="w-full min-h-[80px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={data.onSaveEdit}>
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={data.onCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {ticket.type || 'Ticket'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            {getStatusLabel(ticket.status || '')}
                          </span>
                        </div>
                        <h3 className="heading-card mb-1">{ticket.studentName}</h3>
                        {ticket.assignedTeacherName && (
                          <p className="body-text text-gray-600 mb-1">Assigned to {ticket.assignedTeacherName}</p>
                        )}
                        {ticket.teacherNotes && (
                          <p className="body-text text-gray-700 mb-2">{ticket.teacherNotes}</p>
                        )}
                        <p className="caption text-gray-500">
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => data.onEdit(ticket)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => data.onDelete(ticket)}>
                          Close ticket
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
            </div>
                );
              }}
            </FixedSizeList>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveTicketsManagement;

