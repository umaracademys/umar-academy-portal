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

  // Initiate message state
  const [initiateType, setInitiateType] = useState<'teacher' | 'student' | 'teacher-pair' | 'teacher-student'>('teacher');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedPair, setSelectedPair] = useState<any>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<any[]>([]); // For group messaging

  useEffect(() => {
    loadTeacherPairs();
  }, []);

  const loadTeacherPairs = async () => {
    try {
      const pairs = await getTeacherPairs();
      setTeacherPairs(pairs);
    } catch (error) {
      console.error('Error loading teacher pairs:', error);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Professional Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Message Management</h1>
          <p className="text-gray-600 text-sm">
            Monitor and manage all communications across the platform
          </p>
        </div>

        {/* Professional Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('initiate')}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'initiate'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Initiate Communication
            </button>
            <button
              onClick={() => setActiveTab('teacher-student')}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'teacher-student'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Teacher-Student Messages
            </button>
            <button
              onClick={() => setActiveTab('pair-teacher')}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'pair-teacher'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Pair Teacher Messages
            </button>
          </div>
        </div>

        {/* Initiate Communication Tab */}
        {activeTab === 'initiate' && (
          <Card>
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Start New Communication</h2>
                <p className="text-sm text-gray-600">
                  Select the type of communication you want to initiate
                </p>
              </div>
              
              {/* Communication Type Selector */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-4">Communication Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => setInitiateType('teacher')}
                    className={`p-6 rounded-lg border-2 transition-all text-left ${
                      initiateType === 'teacher'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 mb-1">Message Teacher</div>
                    <div className="text-xs text-gray-500">Send message to individual teacher</div>
                  </button>
                  
                  <button
                    onClick={() => setInitiateType('student')}
                    className={`p-6 rounded-lg border-2 transition-all text-left ${
                      initiateType === 'student'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 mb-1">Message Student</div>
                    <div className="text-xs text-gray-500">Send message to individual student</div>
                  </button>
                  
                  <button
                    onClick={() => setInitiateType('teacher-pair')}
                    className={`p-6 rounded-lg border-2 transition-all text-left ${
                      initiateType === 'teacher-pair'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 mb-1">Message Pair</div>
                    <div className="text-xs text-gray-500">Send message to teacher pair</div>
                  </button>
                  
                  <button
                    onClick={() => setInitiateType('teacher-student')}
                    className={`p-6 rounded-lg border-2 transition-all text-left ${
                      initiateType === 'teacher-student'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 mb-1">Teacher ↔ Student</div>
                    <div className="text-xs text-gray-500">Start conversation between teacher and student</div>
                  </button>
                </div>
              </div>

              {/* Teacher Selection */}
              {(initiateType === 'teacher' || initiateType === 'teacher-student') && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {initiateType === 'teacher-student' ? 'Select Teacher' : 'Select Teacher(s)'}
                  </label>
                  {initiateType === 'teacher' ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                      {teachers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No teachers available</p>
                      ) : (
                        teachers.map((teacher) => (
                          <label key={teacher.id} className="flex items-center space-x-3 cursor-pointer hover:bg-white p-3 rounded-lg transition-colors">
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
                              className="rounded border-gray-300 text-primary focus:ring-primary focus:ring-2"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900">{teacher.fullName}</span>
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white shadow-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
                  <select
                    value={selectedStudent?.id || ''}
                    onChange={(e) => {
                      const student = students.find(s => s.id === e.target.value);
                      setSelectedStudent(student || null);
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white shadow-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Teacher Pair</label>
                  <select
                    value={selectedPair?._id || ''}
                    onChange={(e) => {
                      const pair = teacherPairs.find(p => p._id === e.target.value);
                      setSelectedPair(pair || null);
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white shadow-sm"
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
              <div className="mt-8 pt-6 border-t border-gray-200">
                {initiateType === 'teacher-student' && selectedTeacher && selectedStudent && (
                  <button
                    onClick={handleInitiateTeacherStudent}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Start Conversation
                  </button>
                )}
                {initiateType === 'teacher-pair' && selectedPair && (
                  <button
                    onClick={handleInitiatePairTeacher}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Message Pair
                  </button>
                )}
                {(initiateType === 'teacher' || initiateType === 'student') && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">Group messaging coming soon</p>
                        <p className="text-xs text-blue-700">For now, use the Messages page to view and respond to existing conversations.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
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
          <Card>
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Pair Teacher Messages</h2>
                <p className="text-sm text-gray-600">
                  View and manage communications between teacher pairs
                </p>
              </div>
              <div className="space-y-3">
                {teacherPairs.filter(p => p.status === 'active').length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500 font-medium mb-1">No active teacher pairs</p>
                    <p className="text-sm text-gray-400">There are no active teacher pairs to display.</p>
                  </div>
                ) : (
                  teacherPairs.filter(p => p.status === 'active').map((pair) => (
                    <div
                      key={pair._id}
                      className="p-5 border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm transition-all cursor-pointer bg-white"
                      onClick={() => {
                        setSelectedConversation({ pair });
                        setMessageType('pair-teacher');
                        setShowMessageModal(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{pair.name}</h3>
                          <p className="text-sm text-gray-600">
                            {pair.teacher1?.fullName} & {pair.teacher2?.fullName}
                          </p>
                          {pair.program && (
                            <p className="text-xs text-gray-500 mt-1">{pair.program}</p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
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
