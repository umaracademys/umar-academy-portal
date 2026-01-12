import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from './Card';

interface ApprovedTicketsAdminProps {
  onClose: () => void;
}

const ApprovedTicketsAdmin: React.FC<ApprovedTicketsAdminProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [homeworkContent, setHomeworkContent] = useState('');
  const [homeworkLink, setHomeworkLink] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [assigningHomework, setAssigningHomework] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'sabq' | 'sabqi' | 'manzil'>('all');
  const [viewingTicket, setViewingTicket] = useState<any>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, [dateFilter, customStartDate, customEndDate, filterType]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      
      // Build query params
      const params = new URLSearchParams();
      params.append('status', 'sent_to_assignment');
      
      if (filterType !== 'all') {
        params.append('type', filterType);
      }
      
      const url = `${API_BASE}/tickets?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        let data = await response.json();
        
        // Filter by date on client side (since backend doesn't have date filtering for tickets yet)
        const now = new Date();
        let filteredData = data;
        
        if (dateFilter === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          filteredData = data.filter((ticket: any) => {
            const ticketDate = ticket.sentAt ? new Date(ticket.sentAt) : (ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(ticket.createdAt));
            return ticketDate >= today && ticketDate < tomorrow;
          });
        } else if (dateFilter === '7days') {
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - 7);
          daysAgo.setHours(0, 0, 0, 0);
          filteredData = data.filter((ticket: any) => {
            const ticketDate = ticket.sentAt ? new Date(ticket.sentAt) : (ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(ticket.createdAt));
            return ticketDate >= daysAgo;
          });
        } else if (dateFilter === '30days') {
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - 30);
          daysAgo.setHours(0, 0, 0, 0);
          filteredData = data.filter((ticket: any) => {
            const ticketDate = ticket.sentAt ? new Date(ticket.sentAt) : (ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(ticket.createdAt));
            return ticketDate >= daysAgo;
          });
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          filteredData = data.filter((ticket: any) => {
            const ticketDate = ticket.sentAt ? new Date(ticket.sentAt) : (ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(ticket.createdAt));
            return ticketDate >= start && ticketDate <= end;
          });
        }
        
        // Sort by sentAt or updatedAt descending
        filteredData.sort((a: any, b: any) => {
          const dateA = a.sentAt ? new Date(a.sentAt) : (a.updatedAt ? new Date(a.updatedAt) : new Date(a.createdAt));
          const dateB = b.sentAt ? new Date(b.sentAt) : (b.updatedAt ? new Date(b.updatedAt) : new Date(b.createdAt));
          return dateB.getTime() - dateA.getTime();
        });
        
        setTickets(filteredData);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to load approved tickets');
      }
    } catch (error) {
      console.error('Error loading approved tickets:', error);
      alert('Failed to load approved tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignHomework = async (ticket: any) => {
    if (!homeworkContent.trim() && !additionalNotes.trim()) {
      alert('Please provide homework content or additional notes');
      return;
    }

    // Check if assignment already exists
    if (ticket.sentToAssignmentId) {
      // Update existing assignment
      setAssigningHomework(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
        
        // Get existing assignment
        const assignmentResponse = await fetch(`${API_BASE}/assignments/${ticket.sentToAssignmentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (assignmentResponse.ok) {
          const assignment = await assignmentResponse.json();
          
          // Update assignment with homework
          const updateResponse = await fetch(`${API_BASE}/assignments/${ticket.sentToAssignmentId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...assignment,
              homework: {
                enabled: true,
                content: homeworkContent || assignment.homework?.content || '',
                link: homeworkLink || assignment.homework?.link || ''
              }
            })
          });
          
          if (updateResponse.ok) {
            alert(`Homework updated successfully for ${ticket.studentName}!`);
            setSelectedTicket(null);
            setHomeworkContent('');
            setHomeworkLink('');
            setAdditionalNotes('');
            loadTickets();
          } else {
            const error = await updateResponse.json();
            alert(error.error || 'Failed to update homework');
          }
        } else {
          alert('Assignment not found. Please create homework manually.');
        }
      } catch (error) {
        console.error('Error updating homework:', error);
        alert('Failed to update homework');
      } finally {
        setAssigningHomework(false);
      }
    } else {
      // Create new assignment with homework
      setAssigningHomework(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
        
        // Build homework content
        let homeworkText = homeworkContent || '';
        if (!homeworkText) {
          homeworkText = `Recitation Review Homework - ${ticket.type.toUpperCase()}\n\n`;
          if (ticket.teacherComment) {
            homeworkText += `Teacher Notes:\n${ticket.teacherComment}\n\n`;
          }
          if (ticket.mistakes && ticket.mistakes.length > 0) {
            homeworkText += `Mistakes to work on: ${ticket.mistakes.length} mistake(s) marked\n\n`;
          }
          if (additionalNotes) {
            homeworkText += `Additional notes:\n${additionalNotes}`;
          }
        } else if (additionalNotes) {
          homeworkText += `\n\nAdditional notes:\n${additionalNotes}`;
        }
        
        // Create assignment
        const assignmentResponse = await fetch(`${API_BASE}/assignments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentId: ticket.studentId,
            studentName: ticket.studentName,
            assignedBy: user?.id || '',
            assignedByName: user?.name || user?.email || 'Admin',
            assignedByRole: user?.role === 'superadmin' ? 'super_admin' : 'admin',
            homework: {
              enabled: true,
              content: homeworkText,
              link: homeworkLink || ''
            },
            status: 'active',
            ticketId: ticket._id || ticket.id
          })
        });
        
        if (assignmentResponse.ok) {
          const assignment = await assignmentResponse.json();
          
          // Update ticket with assignment ID
          const ticketUpdateResponse = await fetch(`${API_BASE}/tickets/${ticket._id || ticket.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sentToAssignmentId: assignment._id || assignment.id
            })
          });
          
          if (ticketUpdateResponse.ok) {
            alert(`Homework assigned successfully to ${ticket.studentName}!`);
            setSelectedTicket(null);
            setHomeworkContent('');
            setHomeworkLink('');
            setAdditionalNotes('');
            loadTickets();
          } else {
            alert('Homework assigned but failed to link to ticket');
            loadTickets();
          }
        } else {
          const error = await assignmentResponse.json();
          alert(error.error || 'Failed to assign homework');
        }
      } catch (error) {
        console.error('Error assigning homework:', error);
        alert('Failed to assign homework');
      } finally {
        setAssigningHomework(false);
      }
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sabq': return 'bg-green-100 text-green-800 border-green-300';
      case 'sabqi': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'manzil': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleViewTicket = async (ticket: any) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/tickets/${ticket._id || ticket.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const ticketDetails = await response.json();
        setViewingTicket(ticketDetails);
      } else {
        alert('Failed to load ticket details');
      }
    } catch (error) {
      console.error('Error viewing ticket:', error);
      alert('Failed to load ticket details');
    }
  };

  const handleDeleteTicket = async (ticket: any) => {
    if (!window.confirm(`Are you sure you want to delete this ${ticket.type.toUpperCase()} ticket for ${ticket.studentName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingTicketId(ticket._id || ticket.id);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/tickets/${ticket._id || ticket.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        alert('Ticket deleted successfully!');
        loadTickets();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete ticket');
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket');
    } finally {
      setDeletingTicketId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col border-2 border-primary/30">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0f1a12] via-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <span className="text-2xl">✓</span>
                Approved Tickets
              </h2>
              <p className="text-white/80 text-sm mt-1">View approved tickets and assign homework</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-semibold text-gray-700">Filter by:</label>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="sabq">Sabq</option>
              <option value="sabqi">Sabqi</option>
              <option value="manzil">Manzil</option>
            </select>
            
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
            
            {dateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Start date"
                />
                <span className="text-gray-600">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="End date"
                />
              </>
            )}
            
            <div className="ml-auto text-sm text-gray-600">
              Showing {tickets.length} approved ticket{tickets.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No approved tickets found for the selected period.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const ticketDate = ticket.sentAt ? new Date(ticket.sentAt) : (ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(ticket.createdAt));
                return (
                  <Card key={ticket._id || ticket.id} className="border-2 border-gray-200 hover:border-primary/50 transition-colors">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-primary">{ticket.studentName}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTypeColor(ticket.type)}`}>
                              {ticket.type.toUpperCase()}
                            </span>
                            {ticket.sentToAssignmentId && (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                                ✓ Assignment Created
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            Teacher: {ticket.assignedTeacherName || ticket.assignedTeacherId || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Approved: {formatDateTime(ticketDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewTicket(ticket)}
                            className="px-3 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors text-sm"
                            title="View Ticket Details"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket)}
                            disabled={deletingTicketId === (ticket._id || ticket.id)}
                            className="px-3 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Ticket"
                          >
                            {deletingTicketId === (ticket._id || ticket.id) ? 'Deleting...' : 'Delete'}
                          </button>
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
                          >
                            {ticket.sentToAssignmentId ? 'Update Homework' : 'Assign Homework'}
                          </button>
                        </div>
                      </div>

                      {ticket.teacherComment && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <p className="font-semibold text-blue-700 mb-1">Teacher Comment:</p>
                          <p className="text-gray-700 text-sm">{ticket.teacherComment}</p>
                        </div>
                      )}

                      {ticket.mistakes && ticket.mistakes.length > 0 && (
                        <div className="mb-4">
                          <p className="font-semibold text-gray-700 mb-2">
                            Mistakes Marked: {ticket.mistakes.length}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {ticket.mistakes.slice(0, 8).map((mistake: any, idx: number) => (
                              <div key={idx} className="text-xs bg-gray-100 p-2 rounded">
                                <span className="font-semibold">{mistake.type}</span>
                                {mistake.page && <span className="text-gray-600"> - Page {mistake.page}</span>}
                              </div>
                            ))}
                            {ticket.mistakes.length > 8 && (
                              <div className="text-xs bg-gray-100 p-2 rounded text-center">
                                +{ticket.mistakes.length - 8} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {ticket.adminComment && (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <p className="font-semibold text-yellow-700 mb-1">Admin Comment:</p>
                          <p className="text-gray-700 text-sm">{ticket.adminComment}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Homework Assignment Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-primary/30">
            <div className="px-6 py-4 bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-white">
                  {selectedTicket.sentToAssignmentId ? 'Update' : 'Assign'} Homework to {selectedTicket.studentName}
                </h3>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setHomeworkContent('');
                    setHomeworkLink('');
                    setAdditionalNotes('');
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-700 mb-1">Ticket Type: {selectedTicket.type.toUpperCase()}</p>
                {selectedTicket.teacherComment && (
                  <p className="text-xs text-gray-600 mt-1">Teacher: {selectedTicket.teacherComment.substring(0, 100)}...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Homework Content {selectedTicket.sentToAssignmentId ? '' : '(optional - will auto-generate if empty)'}
                </label>
                <textarea
                  value={homeworkContent}
                  onChange={(e) => setHomeworkContent(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={6}
                  placeholder={selectedTicket.sentToAssignmentId ? "Update homework content..." : "Leave empty to auto-generate from ticket data..."}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Homework Link (optional)</label>
                <input
                  type="url"
                  value={homeworkLink}
                  onChange={(e) => setHomeworkLink(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Additional Notes (optional)</label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Any additional instructions or notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleAssignHomework(selectedTicket)}
                  disabled={assigningHomework}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningHomework ? 'Processing...' : (selectedTicket.sentToAssignmentId ? 'Update Homework' : 'Assign Homework')}
                </button>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setHomeworkContent('');
                    setHomeworkLink('');
                    setAdditionalNotes('');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {viewingTicket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-primary/30">
            <div className="px-6 py-4 bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.95)] border-b-2 border-accent/50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-white">
                  Ticket Details - {viewingTicket.studentName}
                </h3>
                <button
                  onClick={() => setViewingTicket(null)}
                  className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Type</p>
                  <p className={`inline-block px-3 py-1 rounded-full text-sm font-bold border mt-1 ${getTypeColor(viewingTicket.type)}`}>
                    {viewingTicket.type.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Status</p>
                  <p className="text-sm text-gray-800 mt-1">{viewingTicket.status}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Student</p>
                  <p className="text-sm text-gray-800 mt-1">{viewingTicket.studentName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Teacher</p>
                  <p className="text-sm text-gray-800 mt-1">{viewingTicket.assignedTeacherName || viewingTicket.assignedTeacherId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Created By</p>
                  <p className="text-sm text-gray-800 mt-1">{viewingTicket.createdByName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Created At</p>
                  <p className="text-sm text-gray-800 mt-1">{viewingTicket.createdAt ? formatDateTime(viewingTicket.createdAt) : 'N/A'}</p>
                </div>
                {viewingTicket.sentAt && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Sent At</p>
                    <p className="text-sm text-gray-800 mt-1">{formatDateTime(viewingTicket.sentAt)}</p>
                  </div>
                )}
                {viewingTicket.sentToAssignmentId && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Assignment ID</p>
                    <p className="text-sm text-gray-800 mt-1 font-mono">{viewingTicket.sentToAssignmentId}</p>
                  </div>
                )}
              </div>

              {viewingTicket.adminComment && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="font-semibold text-yellow-700 mb-1">Admin Comment:</p>
                  <p className="text-gray-700 text-sm">{viewingTicket.adminComment}</p>
                </div>
              )}

              {viewingTicket.teacherComment && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-blue-700 mb-1">Teacher Comment:</p>
                  <p className="text-gray-700 text-sm">{viewingTicket.teacherComment}</p>
                </div>
              )}

              {viewingTicket.mistakes && viewingTicket.mistakes.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-gray-700 mb-2">Mistakes Marked: {viewingTicket.mistakes.length}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {viewingTicket.mistakes.map((mistake: any, idx: number) => (
                      <div key={idx} className="text-xs bg-white p-2 rounded border">
                        <span className="font-semibold">{mistake.type}</span>
                        {mistake.page && <span className="text-gray-600"> - Page {mistake.page}</span>}
                        {mistake.note && <p className="text-gray-600 mt-1">{mistake.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setViewingTicket(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedTicketsAdmin;

