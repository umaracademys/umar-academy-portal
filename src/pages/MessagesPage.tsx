import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import TeacherStudentMessage from '../components/TeacherStudentMessage';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { teachers, students } = useData();
  const { getTeacherStudentMessages } = useBackendData();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<{
    teacher?: any;
    student?: any;
  } | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadConversations();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let filters: any = { adminView: 'true' }; // Get all for admin
      
      // For teachers, get their conversations
      if (user.role === 'teacher') {
        const teacher = teachers.find(t => t.email === user.email);
        if (teacher) {
          const teacherId = (teacher as any)._id || (teacher as any).teacherDocumentId || teacher.id;
          filters.teacherId = teacherId;
          filters.adminView = undefined; // Remove admin view for teacher
        }
      }
      
      // For students, get their conversations
      if (user.role === 'student') {
        const student = students.find(s => s.email === user.email);
        if (student) {
          const studentId = (student as any)._id || student.id;
          filters.studentId = studentId;
          filters.adminView = undefined; // Remove admin view for student
        }
      }

      const allMessages = await getTeacherStudentMessages(filters);
      
      // Group messages by conversation
      const conversationMap = new Map<string, any>();
      
      allMessages.forEach((msg: any) => {
        const teacherId = (msg.fromTeacher?._id?.toString() || msg.toTeacher?._id?.toString() || msg.fromTeacher?.toString() || msg.toTeacher?.toString()) || 'unknown';
        const studentId = (msg.fromStudent?._id?.toString() || msg.toStudent?._id?.toString() || msg.fromStudent?.toString() || msg.toStudent?.toString()) || 'unknown';
        const key = `${teacherId}-${studentId}`;
        
        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            teacher: msg.fromTeacher || msg.toTeacher,
            student: msg.fromStudent || msg.toStudent,
            messages: [],
            lastMessage: null,
            unreadCount: 0
          });
        }
        
        const conv = conversationMap.get(key);
        conv.messages.push(msg);
        
        // Track last message
        if (!conv.lastMessage || new Date(msg.createdAt) > new Date(conv.lastMessage.createdAt)) {
          conv.lastMessage = msg;
        }
        
        // Count unread messages
        if (user.role === 'teacher' && msg.toTeacher && !msg.read) {
          const teacherId = (msg.toTeacher._id?.toString() || msg.toTeacher.toString());
          const currentTeacherId = teachers.find(t => t.email === user.email) 
            ? ((teachers.find(t => t.email === user.email) as any)._id || (teachers.find(t => t.email === user.email) as any).teacherDocumentId || teachers.find(t => t.email === user.email)?.id)
            : null;
          if (teacherId === currentTeacherId?.toString()) {
            conv.unreadCount++;
          }
        } else if (user.role === 'student' && msg.toStudent && !msg.read) {
          const studentId = (msg.toStudent._id?.toString() || msg.toStudent.toString());
          const currentStudentId = students.find(s => s.email === user.email)?.id;
          if (studentId === currentStudentId?.toString()) {
            conv.unreadCount++;
          }
        }
      });
      
      // Convert to array and sort by last message time
      const conversationsArray = Array.from(conversationMap.values())
        .sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
        });
      
      setConversations(conversationsArray);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const getConversationName = (conv: any) => {
    if (user?.role === 'teacher') {
      return conv.student?.fullName || 'Student';
    } else if (user?.role === 'student') {
      return conv.teacher?.fullName || 'Teacher';
    } else {
      // Admin view
      return `${conv.teacher?.fullName || 'Teacher'} ↔ ${conv.student?.fullName || 'Student'}`;
    }
  };

  const handleOpenConversation = (conv: any) => {
    setSelectedConversation({
      teacher: conv.teacher,
      student: conv.student
    });
    setShowMessageModal(true);
  };

  // Redirect super admin to dedicated page
  useEffect(() => {
    if ((user as any)?.role === 'superadmin') {
      navigate('/super-admin/messages');
    }
  }, [user, navigate]);

  if ((user as any)?.role === 'superadmin') {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
      <AppLayout
        sidebar={
          <Sidebar
            activeSection="messages"
            onSectionChange={() => {}}
            isMobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((o) => !o)}
            onMobileClose={() => setSidebarOpen(false)}
          />
        }
        sidebarOpen={sidebarOpen}
        onOverlayClick={() => setSidebarOpen(false)}
        maxWidth="7xl"
      >
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="heading-page">Messages</h1>
            <p className="caption mt-1 text-gray-600">
              {user?.role === 'teacher' && 'Talk with your students'}
              {user?.role === 'student' && 'Talk with your teachers'}
              {user?.role === 'admin' && 'Teacher–student conversations'}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-4 sm:py-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12" role="status">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
                  <p className="body-text text-gray-600 mt-2">Loading...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="body-text text-gray-700">No messages yet</p>
                  <p className="caption mt-1 text-gray-600">
                    {user?.role === 'teacher' && 'Start a conversation from the dashboard'}
                    {user?.role === 'student' && 'Your teachers can message you here'}
                    {user?.role === 'admin' && 'Conversations will appear here'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {conversations.map((conv, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => handleOpenConversation(conv)}
                      className="w-full text-left cursor-pointer rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition min-h-[44px] flex flex-col justify-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="heading-card truncate">
                            {getConversationName(conv)}
                          </h3>
                          {conv.lastMessage && (
                            <p className="body-text text-gray-600 mt-0.5 line-clamp-2">
                              {conv.lastMessage.message}
                            </p>
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="shrink-0 px-2 py-0.5 bg-gray-800 text-white text-xs font-medium rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between caption text-gray-500">
                        <span>
                          {conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''}
                        </span>
                        {conv.lastMessage && (
                          <span>{formatDate(conv.lastMessage.createdAt)}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Modal */}
      {showMessageModal && selectedConversation && (
        <TeacherStudentMessage
          teacher={selectedConversation.teacher}
          student={selectedConversation.student}
          onClose={() => {
            setShowMessageModal(false);
            setSelectedConversation(null);
            loadConversations(); // Refresh conversations after closing
          }}
          adminView={(user as any)?.role === 'admin' || (user as any)?.role === 'superadmin'}
          adminCanInitiate={(user as any)?.role === 'admin' || (user as any)?.role === 'superadmin'}
        />
      )}
      </AppLayout>
    </div>
  );
};

export default MessagesPage;

