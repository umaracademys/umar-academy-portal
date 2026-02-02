import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import type { Ticket } from '../types/ticket';

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';

const TicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) {
        setError('Ticket ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setStatusCode(null);

        const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE}/tickets/${ticketId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        setStatusCode(response.status);

        if (response.status === 404) {
          setError('Ticket not found');
          setTicket(null);
          setLoading(false);
          return;
        }

        if (response.status === 403) {
          setError('You do not have permission to view this ticket');
          setTicket(null);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch ticket (${response.status})`);
        }

        const data = await response.json();
        const normalized: Ticket = {
          ...data,
          id: data._id || data.id,
        };
        setTicket(normalized);
      } catch (err) {
        console.error('TicketDetailPage: Error fetching ticket', err);
        setError(err instanceof Error ? err.message : 'Failed to load ticket');
        setTicket(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  if (loading) {
    return (
      <AppLayout
        header={<Header />}
        sidebar={<Sidebar />}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading ticket...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout
        header={<Header />}
        sidebar={<Sidebar />}
      >
        <div className="max-w-2xl mx-auto p-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-error font-semibold mb-2">
                  {statusCode === 404 ? 'Ticket Not Found' : statusCode === 403 ? 'Access Denied' : 'Error'}
                </p>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="secondary" onClick={() => navigate(-1)}>
                    Go Back
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/dashboard')}>
                    Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return null;
  }

  const reviewUrl = `/mushaf/review/${ticket.id}`;

  return (
    <AppLayout
      header={<Header />}
      sidebar={<Sidebar />}
    >
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Ticket: {ticket.studentName} – {(ticket.type || 'TICKET').toUpperCase()}
          </h1>
          <Link to={reviewUrl}>
            <Button variant="primary">Review in Mushaf</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Details</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Student:</span>
                <span className="ml-2 font-medium">{ticket.studentName}</span>
              </div>
              <div>
                <span className="text-gray-500">Type:</span>
                <span className="ml-2 font-medium capitalize">{(ticket.type || 'sabq')}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className="ml-2 font-medium capitalize">{ticket.status?.replace('_', ' ') || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-gray-500">Assigned Teacher:</span>
                <span className="ml-2 font-medium">{ticket.assignedTeacherName || '—'}</span>
              </div>
            </div>
            {ticket.teacherComment && (
              <div>
                <span className="text-gray-500 text-sm block mb-1">Teacher Comment:</span>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{ticket.teacherComment}</p>
              </div>
            )}
            {ticket.adminComment && (
              <div>
                <span className="text-gray-500 text-sm block mb-1">Admin Comment:</span>
                <p className="text-gray-900 bg-gray-50 p-2 rounded">{ticket.adminComment}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Link to={reviewUrl}>
            <Button variant="primary">Review in Mushaf</Button>
          </Link>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default TicketDetailPage;
