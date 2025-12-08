import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';
import Header from '../components/Header';
import TeacherStudentMessage from '../components/TeacherStudentMessage';
import Card from '../components/Card';

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
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'teacher' && 'Communicate with your students'}
            {user?.role === 'student' && 'Communicate with your teachers'}
            {user?.role === 'admin' && 'View all teacher-student communications'}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-lg font-semibold text-gray-700 mb-2">No conversations yet</p>
              <p className="text-sm text-gray-500">
                {user?.role === 'teacher' && 'Start messaging your students from the Teacher Dashboard'}
                {user?.role === 'student' && 'Your teachers will be able to message you here'}
                {((user as any)?.role === 'admin' || (user as any)?.role === 'superadmin') ? 'No messages between teachers and students yet' : ''}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversations.map((conv, idx) => (
              <Card key={idx}>
                <div
                  onClick={() => handleOpenConversation(conv)}
                  className="cursor-pointer hover:bg-gray-50 transition p-4 rounded-lg border-2 border-transparent hover:border-primary"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-primary">
                        {getConversationName(conv)}
                      </h3>
                      {conv.lastMessage && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {conv.lastMessage.message}
                        </p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''}
                    </span>
                    {conv.lastMessage && (
                      <span>{formatDate(conv.lastMessage.createdAt)}</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
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
    </div>
  );
};

export default MessagesPage;

