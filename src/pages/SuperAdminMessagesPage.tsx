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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Messages</h1>
          <p className="text-gray-600 mt-2">
            View all communications and initiate new conversations
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b-2 border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('initiate')}
              className={`px-4 py-2 font-bold transition ${
                activeTab === 'initiate'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              Initiate Communication
            </button>
            <button
              onClick={() => setActiveTab('teacher-student')}
              className={`px-4 py-2 font-bold transition ${
                activeTab === 'teacher-student'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              Teacher-Student Messages
            </button>
            <button
              onClick={() => setActiveTab('pair-teacher')}
              className={`px-4 py-2 font-bold transition ${
                activeTab === 'pair-teacher'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              Pair Teacher Messages
            </button>
          </div>
        </div>

        {/* Initiate Communication Tab */}
        {activeTab === 'initiate' && (
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-primary mb-6">Start New Communication</h2>
              
              {/* Communication Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-primary mb-2">Communication Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => setInitiateType('teacher')}
                    className={`p-4 rounded-lg border-2 transition ${
                      initiateType === 'teacher'
                        ? 'border-primary bg-soft-primary'
                        : 'border-gray-200 hover:border-primary'
                    }`}
                  >
                    <div className="text-2xl mb-2">👨‍🏫</div>
                    <div className="font-bold text-primary">Message Teacher</div>
                    <div className="text-xs text-gray-600 mt-1">Individual teacher</div>
                  </button>
                  
                  <button
                    onClick={() => setInitiateType('student')}
                    className={`p-4 rounded-lg border-2 transition ${
                      initiateType === 'student'
                        ? 'border-primary bg-soft-primary'
                        : 'border-gray-200 hover:border-primary'
                    }`}
                  >
                    <div className="text-2xl mb-2">🎓</div>
                    <div className="font-bold text-primary">Message Student</div>
                    <div className="text-xs text-gray-600 mt-1">Individual student</div>
                  </button>
                  
                  <button
                    onClick={() => setInitiateType('teacher-pair')}
                    className={`p-4 rounded-lg border-2 transition ${
                      initiateType === 'teacher-pair'
                        ? 'border-primary bg-soft-primary'
                        : 'border-gray-200 hover:border-primary'
                    }`}
                  >
                    <div className="text-2xl mb-2">👥</div>
                    <div className="font-bold text-primary">Message Pair</div>
                    <div className="text-xs text-gray-600 mt-1">Teacher pair</div>
                  </button>
                  
                  <button
                    onClick={() => setInitiateType('teacher-student')}
                    className={`p-4 rounded-lg border-2 transition ${
                      initiateType === 'teacher-student'
                        ? 'border-primary bg-soft-primary'
                        : 'border-gray-200 hover:border-primary'
                    }`}
                  >
                    <div className="text-2xl mb-2">💬</div>
                    <div className="font-bold text-primary">Teacher ↔ Student</div>
                    <div className="text-xs text-gray-600 mt-1">Start conversation</div>
                  </button>
                </div>
              </div>

              {/* Teacher Selection */}
              {(initiateType === 'teacher' || initiateType === 'teacher-student') && (
                <div className="mb-4">
                  <label className="block text-sm font-bold text-primary mb-2">
                    {initiateType === 'teacher-student' ? 'Select Teacher' : 'Select Teacher(s)'}
                  </label>
                  {initiateType === 'teacher' ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-gray-200 rounded-lg p-4">
                      {teachers.map((teacher) => (
                        <label key={teacher.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
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
                            className="rounded border-primary text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-semibold text-gray-700">{teacher.fullName}</span>
                          <span className="text-xs text-gray-500">({teacher.employmentType})</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <select
                      value={selectedTeacher?.id || ''}
                      onChange={(e) => {
                        const teacher = teachers.find(t => t.id === e.target.value);
                        setSelectedTeacher(teacher || null);
                      }}
                      className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
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
                <div className="mb-4">
                  <label className="block text-sm font-bold text-primary mb-2">Select Student</label>
                  <select
                    value={selectedStudent?.id || ''}
                    onChange={(e) => {
                      const student = students.find(s => s.id === e.target.value);
                      setSelectedStudent(student || null);
                    }}
                    className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
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
                <div className="mb-4">
                  <label className="block text-sm font-bold text-primary mb-2">Select Teacher Pair</label>
                  <select
                    value={selectedPair?._id || ''}
                    onChange={(e) => {
                      const pair = teacherPairs.find(p => p._id === e.target.value);
                      setSelectedPair(pair || null);
                    }}
                    className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
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
              <div className="mt-6 flex gap-4">
                {initiateType === 'teacher-student' && selectedTeacher && selectedStudent && (
                  <button
                    onClick={handleInitiateTeacherStudent}
                    className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition"
                  >
                    Start Conversation
                  </button>
                )}
                {initiateType === 'teacher-pair' && selectedPair && (
                  <button
                    onClick={handleInitiatePairTeacher}
                    className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition"
                  >
                    Message Pair
                  </button>
                )}
                {(initiateType === 'teacher' || initiateType === 'student') && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                    <p className="font-semibold mb-2">Group messaging coming soon!</p>
                    <p>For now, use the Messages page to view and respond to existing conversations.</p>
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
            <div className="p-6">
              <h2 className="text-2xl font-bold text-primary mb-4">Pair Teacher Messages</h2>
              <div className="space-y-4">
                {teacherPairs.filter(p => p.status === 'active').map((pair) => (
                  <div
                    key={pair._id}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition cursor-pointer"
                    onClick={() => {
                      setSelectedConversation({ pair });
                      setMessageType('pair-teacher');
                      setShowMessageModal(true);
                    }}
                  >
                    <h3 className="font-bold text-lg text-primary mb-2">{pair.name}</h3>
                    <p className="text-sm text-gray-600">
                      {pair.teacher1?.fullName} & {pair.teacher2?.fullName} - {pair.program}
                    </p>
                  </div>
                ))}
                {teacherPairs.filter(p => p.status === 'active').length === 0 && (
                  <p className="text-gray-500 text-center py-8">No active teacher pairs found.</p>
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

