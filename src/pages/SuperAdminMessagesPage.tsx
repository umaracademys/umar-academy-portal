import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';
import Header from '../components/Header';
import TeacherStudentMessage from '../components/TeacherStudentMessage';
import PairTeacherMessage from '../components/PairTeacherMessage';
import TeacherStudentMessagesAdmin from '../components/TeacherStudentMessagesAdmin';
import PairTeacherMessagesAdmin from '../components/PairTeacherMessagesAdmin';

const SuperAdminMessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { teachers, students } = useData();
  const { getTeacherPairs, getPairStudents, getTeacherStudentMessages, getPairTeacherMessages } = useBackendData();
  const [activeTab, setActiveTab] = useState<'teacher-student' | 'pair-teacher' | 'initiate'>('teacher-student');
  const [teacherPairs, setTeacherPairs] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageType, setMessageType] = useState<'teacher-student' | 'pair-teacher' | null>(null);
  const [stats, setStats] = useState({ totalMessages: 0, activeConversations: 0, unreadCount: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'teacher-student' | 'pair-teacher'>('all');

  // Initiate message state
  const [initiateType, setInitiateType] = useState<'teacher' | 'student' | 'teacher-pair' | 'teacher-student'>('teacher-student');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedPair, setSelectedPair] = useState<any>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<any[]>([]);

  useEffect(() => {
    loadTeacherPairs();
    loadStats();
  }, []);

  const loadTeacherPairs = async () => {
    try {
      const pairs = await getTeacherPairs();
      setTeacherPairs(pairs);
    } catch (error) {
      console.error('Error loading teacher pairs:', error);
    }
  };

  const loadStats = async () => {
    try {
      const allMessages = await getTeacherStudentMessages({ adminView: 'true' });
      const activePairs = teacherPairs.filter(p => p.status === 'active').length;
      setStats({
        totalMessages: allMessages.length,
        activeConversations: activePairs,
        unreadCount: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleInitiateTeacherStudent = () => {
    if (selectedTeacher && selectedStudent) {
      setSelectedConversation({
        teacher: selectedTeacher,
        student: selectedStudent
      });
      setMessageType('teacher-student');
      setShowMessageModal(true);
    }
  };

  const handleInitiatePairTeacher = () => {
    if (selectedPair) {
      setSelectedConversation({
        pair: selectedPair
      });
      setMessageType('pair-teacher');
      setShowMessageModal(true);
    }
  };

  const activePairs = teacherPairs.filter(p => p.status === 'active');

  const filteredPairs = useMemo(() => {
    if (!searchQuery) return activePairs;
    return activePairs.filter(pair => 
      pair.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.teacher1?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.teacher2?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.program?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activePairs, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Modern Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                💬 Message Center
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Centralized communication hub for all platform conversations
              </p>
            </div>
            <button
              onClick={() => setActiveTab('initiate')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Conversation
            </button>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Messages</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalMessages.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Across all conversations</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Conversations</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeConversations}</p>
                  <p className="text-xs text-gray-500 mt-1">Currently ongoing</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Unread Messages</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.unreadCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Requiring attention</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
          <div className="flex border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
            <button
              onClick={() => setActiveTab('teacher-student')}
              className={`flex-1 px-4 sm:px-6 py-4 text-sm font-semibold transition-all relative group ${
                activeTab === 'teacher-student'
                  ? 'text-blue-600 bg-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className={`w-5 h-5 ${activeTab === 'teacher-student' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="hidden sm:inline">Teacher-Student</span>
                <span className="sm:hidden">T-S</span>
              </div>
              {activeTab === 'teacher-student' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-500"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('pair-teacher')}
              className={`flex-1 px-4 sm:px-6 py-4 text-sm font-semibold transition-all relative group ${
                activeTab === 'pair-teacher'
                  ? 'text-blue-600 bg-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className={`w-5 h-5 ${activeTab === 'pair-teacher' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="hidden sm:inline">Pair Teachers</span>
                <span className="sm:hidden">Pairs</span>
              </div>
              {activeTab === 'pair-teacher' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-500"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('initiate')}
              className={`flex-1 px-4 sm:px-6 py-4 text-sm font-semibold transition-all relative group ${
                activeTab === 'initiate'
                  ? 'text-blue-600 bg-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className={`w-5 h-5 ${activeTab === 'initiate' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New Message</span>
                <span className="sm:hidden">New</span>
              </div>
              {activeTab === 'initiate' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-500"></div>
              )}
            </button>
          </div>
        </div>

        {/* Initiate Communication Tab - Redesigned */}
        {activeTab === 'initiate' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Start New Conversation</h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  Choose the type of communication you want to initiate
                </p>
              </div>
              
              {/* Modern Communication Type Selector */}
              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-700 mb-4 uppercase tracking-wider">Select Communication Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { type: 'teacher-student', icon: '💬', title: 'Teacher ↔ Student', desc: 'Start conversation between teacher and student' },
                    { type: 'teacher-pair', icon: '👥', title: 'Teacher Pair', desc: 'Message a teacher pair' },
                    { type: 'teacher', icon: '👨‍🏫', title: 'Message Teacher', desc: 'Send message to teacher' },
                    { type: 'student', icon: '🎓', title: 'Message Student', desc: 'Send message to student' },
                  ].map((option) => (
                    <button
                      key={option.type}
                      onClick={() => setInitiateType(option.type as any)}
                      className={`p-5 sm:p-6 rounded-2xl border-2 transition-all text-left group hover:scale-[1.02] ${
                        initiateType === option.type
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-xl shadow-blue-500/20'
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-lg bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`text-3xl transition-transform ${initiateType === option.type ? 'scale-110' : ''}`}>
                          {option.icon}
                        </div>
                        {initiateType === option.type && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className={`font-bold text-gray-900 mb-1 text-base sm:text-lg ${initiateType === option.type ? 'text-blue-900' : ''}`}>
                        {option.title}
                      </div>
                      <div className={`text-xs sm:text-sm ${initiateType === option.type ? 'text-blue-700' : 'text-gray-500'}`}>
                        {option.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Teacher Selection */}
              {(initiateType === 'teacher' || initiateType === 'teacher-student') && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {initiateType === 'teacher-student' ? 'Select Teacher' : 'Select Teacher(s)'}
                  </label>
                  {initiateType === 'teacher' ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-gray-50/50">
                      {teachers.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-3">👨‍🏫</div>
                          <p className="text-sm text-gray-500">No teachers available</p>
                        </div>
                      ) : (
                        teachers.map((teacher) => (
                          <label key={teacher.id} className="flex items-center space-x-3 cursor-pointer hover:bg-white p-3 rounded-lg transition-all border border-transparent hover:border-blue-200 hover:shadow-sm">
                            <input
                              type="checkbox"
                              checked={selectedTeachers.some(t => t.id === teacher.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTeachers([...selectedTeachers, teacher]);
                                } else {
                                  setSelectedTeachers(selectedTeachers.filter(t => t.id !== teacher.id));
                                }
                              }}
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-semibold text-gray-900">{teacher.fullName}</span>
                              <span className="text-xs text-gray-500 ml-2">({teacher.employmentType})</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  ) : (
                    <select
                      value={selectedTeacher?.id || ''}
                      onChange={(e) => {
                        const teacher = teachers.find(t => t.id === e.target.value);
                        setSelectedTeacher(teacher || null);
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white shadow-sm transition-all font-medium"
                    >
                      <option value="">Select a teacher...</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.fullName} ({teacher.employmentType})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Student Selection */}
              {(initiateType === 'student' || initiateType === 'teacher-student') && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Select Student</label>
                  <select
                    value={selectedStudent?.id || ''}
                    onChange={(e) => {
                      const student = students.find(s => s.id === e.target.value);
                      setSelectedStudent(student || null);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white shadow-sm transition-all font-medium"
                  >
                    <option value="">Select a student...</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.fullName} ({student.program})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Teacher Pair Selection */}
              {initiateType === 'teacher-pair' && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Select Teacher Pair</label>
                  <select
                    value={selectedPair?._id || ''}
                    onChange={(e) => {
                      const pair = teacherPairs.find(p => p._id === e.target.value);
                      setSelectedPair(pair || null);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white shadow-sm transition-all font-medium"
                  >
                    <option value="">Select a teacher pair...</option>
                    {teacherPairs.filter(p => p.status === 'active').map((pair) => (
                      <option key={pair._id} value={pair._id}>
                        {pair.name} - {pair.teacher1?.fullName} & {pair.teacher2?.fullName} ({pair.program})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t-2 border-gray-200">
                {initiateType === 'teacher-student' && selectedTeacher && selectedStudent && (
                  <button
                    onClick={handleInitiateTeacherStudent}
                    className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Start Conversation
                  </button>
                )}
                {initiateType === 'teacher-pair' && selectedPair && (
                  <button
                    onClick={handleInitiatePairTeacher}
                    className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message Pair
                  </button>
                )}
                {(initiateType === 'teacher' || initiateType === 'student') && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-blue-900 mb-1">Group messaging coming soon</p>
                        <p className="text-sm text-blue-700">Use the Messages tab to view and respond to existing conversations.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Teacher-Student Messages Tab */}
        {activeTab === 'teacher-student' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            <TeacherStudentMessagesAdmin
              onClose={() => {}}
              onInitiateMessage={(teacher: any, student: any) => {
                setSelectedConversation({ teacher, student });
                setMessageType('teacher-student');
                setShowMessageModal(true);
              }}
            />
          </div>
        )}

        {/* Pair Teacher Messages Tab - Redesigned */}
        {activeTab === 'pair-teacher' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="p-6 sm:p-8">
              {/* Search and Filter Bar */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search pairs by name, teachers, or program..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-11 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white shadow-sm transition-all"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Teacher Pairs</h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  Manage communications between teacher pairs
                </p>
              </div>

              <div className="space-y-4">
                {filteredPairs.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-gray-700 font-bold text-lg mb-2">
                      {searchQuery ? 'No pairs found' : 'No active teacher pairs'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {searchQuery ? 'Try adjusting your search query' : 'There are no active teacher pairs to display.'}
                    </p>
                  </div>
                ) : (
                  filteredPairs.map((pair) => (
                    <div
                      key={pair._id}
                      className="group p-5 sm:p-6 border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer bg-white hover:-translate-y-1"
                      onClick={() => {
                        setSelectedConversation({ pair });
                        setMessageType('pair-teacher');
                        setShowMessageModal(true);
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-400/10 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-blue-400/20 transition-all flex-shrink-0">
                            <span className="text-2xl">👥</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-lg sm:text-xl mb-1">{pair.name}</h3>
                            <p className="text-sm text-gray-600 font-medium mb-2">
                              {pair.teacher1?.fullName} & {pair.teacher2?.fullName}
                            </p>
                            {pair.program && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                {pair.program}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600 transition-colors hidden sm:inline">
                            View Messages
                          </span>
                          <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                            <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Modals */}
      {showMessageModal && messageType === 'teacher-student' && selectedConversation?.teacher && selectedConversation?.student && (
        <TeacherStudentMessage
          teacher={selectedConversation.teacher}
          student={selectedConversation.student}
          onClose={() => {
            setShowMessageModal(false);
            setSelectedConversation(null);
            setMessageType(null);
          }}
          adminView={true}
          adminCanInitiate={true}
        />
      )}

      {showMessageModal && messageType === 'pair-teacher' && selectedConversation?.pair && (
        <PairTeacherMessage
          pair={selectedConversation.pair}
          currentTeacher={selectedConversation.pair.teacher1}
          pairPartner={selectedConversation.pair.teacher2}
          onClose={() => {
            setShowMessageModal(false);
            setSelectedConversation(null);
            setMessageType(null);
          }}
        />
      )}
    </div>
  );
};

export default SuperAdminMessagesPage;
