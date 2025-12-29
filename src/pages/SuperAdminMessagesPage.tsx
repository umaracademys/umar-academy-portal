import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useBackendData } from '../contexts/BackendDataContext';
import Header from '../components/Header';
import TeacherStudentMessage from '../components/TeacherStudentMessage';
import PairTeacherMessage from '../components/PairTeacherMessage';
import TeacherStudentMessagesAdmin from '../components/TeacherStudentMessagesAdmin';
import PairTeacherMessagesAdmin from '../components/PairTeacherMessagesAdmin';
import Card from '../components/Card';

const SuperAdminMessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { teachers, students } = useData();
  const { getTeacherPairs, getPairStudents, getTeacherStudentMessages, getPairTeacherMessages } = useBackendData();
  const [activeTab, setActiveTab] = useState<'teacher-student' | 'pair-teacher' | 'initiate'>('initiate');
  const [teacherPairs, setTeacherPairs] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageType, setMessageType] = useState<'teacher-student' | 'pair-teacher' | null>(null);
  const [stats, setStats] = useState({ totalMessages: 0, activeConversations: 0, unreadCount: 0 });

  // Initiate message state
  const [initiateType, setInitiateType] = useState<'teacher' | 'student' | 'teacher-pair' | 'teacher-student'>('teacher');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedPair, setSelectedPair] = useState<any>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<any[]>([]); // For group messaging

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
        unreadCount: 0 // Can be calculated from messages
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Professional Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Message Management</h1>
              <p className="text-gray-600 text-base">
                Monitor and manage all communications across the platform
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-semibold">
                <span className="text-sm">Super Admin</span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Messages</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active Conversations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeConversations}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Unread Messages</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.unreadCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Professional Tabs */}
        <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200 bg-gray-50/50">
            <button
              onClick={() => setActiveTab('initiate')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all relative group ${
                activeTab === 'initiate'
                  ? 'text-primary bg-white border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className={`w-5 h-5 ${activeTab === 'initiate' ? 'text-primary' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Initiate Communication</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('teacher-student')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all relative group ${
                activeTab === 'teacher-student'
                  ? 'text-primary bg-white border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className={`w-5 h-5 ${activeTab === 'teacher-student' ? 'text-primary' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Teacher-Student</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('pair-teacher')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all relative group ${
                activeTab === 'pair-teacher'
                  ? 'text-primary bg-white border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className={`w-5 h-5 ${activeTab === 'pair-teacher' ? 'text-primary' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Pair Teachers</span>
              </div>
            </button>
          </div>
        </div>

        {/* Initiate Communication Tab */}
        {activeTab === 'initiate' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Start New Communication</h2>
                <p className="text-gray-600 text-base">
                  Select the type of communication you want to initiate
                </p>
              </div>
              
              {/* Communication Type Selector */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Communication Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => setInitiateType('teacher')}
                    className={`p-6 rounded-xl border-2 transition-all text-left group hover:scale-[1.02] ${
                      initiateType === 'teacher'
                        ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10'
                        : 'border-gray-200 hover:border-primary/50 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        initiateType === 'teacher' 
                          ? 'bg-primary text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      {initiateType === 'teacher' && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-gray-900 mb-1 text-lg">Message Teacher</div>
                    <div className="text-sm text-gray-500">Send message to individual teacher</div>
                  </button>
                  
                  <button
                    onClick={() => setInitiateType('student')}
                    className={`p-6 rounded-xl border-2 transition-all text-left group hover:scale-[1.02] ${
                      initiateType === 'student'
                        ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10'
                        : 'border-gray-200 hover:border-primary/50 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        initiateType === 'student' 
                          ? 'bg-primary text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      {initiateType === 'student' && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-gray-900 mb-1 text-lg">Message Student</div>
                    <div className="text-sm text-gray-500">Send message to individual student</div>
                  </button>
                  
                  <button
                    onClick={() => setInitiateType('teacher-pair')}
                    className={`p-6 rounded-xl border-2 transition-all text-left group hover:scale-[1.02] ${
                      initiateType === 'teacher-pair'
                        ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10'
                        : 'border-gray-200 hover:border-primary/50 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        initiateType === 'teacher-pair' 
                          ? 'bg-primary text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      {initiateType === 'teacher-pair' && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-gray-900 mb-1 text-lg">Message Pair</div>
                    <div className="text-sm text-gray-500">Send message to teacher pair</div>
                  </button>
                  
                  <button
                    onClick={() => setInitiateType('teacher-student')}
                    className={`p-6 rounded-xl border-2 transition-all text-left group hover:scale-[1.02] ${
                      initiateType === 'teacher-student'
                        ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/10'
                        : 'border-gray-200 hover:border-primary/50 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        initiateType === 'teacher-student' 
                          ? 'bg-primary text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-600 group-hover:bg-primary/10 group-hover:text-primary'
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      {initiateType === 'teacher-student' && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-gray-900 mb-1 text-lg">Teacher ↔ Student</div>
                    <div className="text-sm text-gray-500">Start conversation between teacher and student</div>
                  </button>
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
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-sm text-gray-500">No teachers available</p>
                        </div>
                      ) : (
                        teachers.map((teacher) => (
                          <label key={teacher.id} className="flex items-center space-x-3 cursor-pointer hover:bg-white p-4 rounded-lg transition-all border border-transparent hover:border-primary/20 hover:shadow-sm">
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
                              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white shadow-sm transition-all font-medium"
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white shadow-sm transition-all font-medium"
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white shadow-sm transition-all font-medium"
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
                    className="px-8 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-semibold hover:from-primary/90 hover:to-primary/80 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center gap-2"
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
                    className="px-8 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-semibold hover:from-primary/90 hover:to-primary/80 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message Pair
                  </button>
                )}
                {(initiateType === 'teacher' || initiateType === 'student') && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-bold text-blue-900 mb-1">Group messaging coming soon</p>
                        <p className="text-sm text-blue-700">For now, use the Messages page to view and respond to existing conversations.</p>
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
          <div>
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

        {/* Pair Teacher Messages Tab */}
        {activeTab === 'pair-teacher' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Pair Teacher Messages</h2>
                <p className="text-gray-600 text-base">
                  View and manage communications between teacher pairs
                </p>
              </div>
              <div className="space-y-4">
                {activePairs.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-bold text-lg mb-2">No active teacher pairs</p>
                    <p className="text-sm text-gray-500">There are no active teacher pairs to display.</p>
                  </div>
                ) : (
                  activePairs.map((pair) => (
                    <div
                      key={pair._id}
                      className="p-6 border-2 border-gray-200 rounded-xl hover:border-primary hover:shadow-lg transition-all cursor-pointer bg-white group"
                      onClick={() => {
                        setSelectedConversation({ pair });
                        setMessageType('pair-teacher');
                        setShowMessageModal(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
                              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg mb-1">{pair.name}</h3>
                              <p className="text-sm text-gray-600 font-medium">
                                {pair.teacher1?.fullName} & {pair.teacher2?.fullName}
                              </p>
                            </div>
                          </div>
                          {pair.program && (
                            <div className="ml-16 mt-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                {pair.program}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500 group-hover:text-primary transition-colors">View Messages</span>
                          <svg className="w-6 h-6 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
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
