import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import DebugPanel from '../components/DebugPanel';

interface Assignment {
  date: string;
  sabq: string;
  sabqi: string;
  manzil: string;
  homework: string;
  comment: string;
  teacherName: string;
}

const StudentAssignments: React.FC = () => {
  const { user } = useAuth();
  const { students } = useData();
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current');

  // Mock assignments (in real app, this would fetch from API)
  const mockAssignments: Assignment[] = [
    {
      date: new Date().toISOString().slice(0, 10),
      sabq: 'Surah Al-Baqarah: 1-5',
      sabqi: 'Surah Al-Fatiha',
      manzil: 'Manzil 1 - Review',
      homework: 'Memorize Surah Al-Baqarah verses 6-10. Practice Tajweed rules for Qalqalah.',
      comment: 'Excellent progress! Keep practicing your pronunciation.',
      teacherName: 'Dr. Ibrahim Yusuf'
    },
    {
      date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      sabq: 'Surah Al-Baqarah: 255-260',
      sabqi: 'Surah Al-Ikhlas',
      manzil: 'Manzil 2 - Complete',
      homework: 'Review yesterday\'s lesson. Complete reading practice for Surah Al-Mulk.',
      comment: 'Good work. Focus on elongation (Madd) rules.',
      teacherName: 'Dr. Ibrahim Yusuf'
    },
    {
      date: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
      sabq: 'Surah Al-Imran: 1-10',
      sabqi: 'Surah Al-Falaq',
      manzil: 'Manzil 1 - In Progress',
      homework: 'Practice recitation of new verses. Listen to Qari Abdul Basit recording.',
      comment: 'Very good! Work on your Makhraj (articulation points).',
      teacherName: 'Dr. Ibrahim Yusuf'
    }
  ];

  // Filter assignments based on view mode
  const displayedAssignments = useMemo(() => {
    if (viewMode === 'current') {
      return mockAssignments.filter(a => a.date === selectedDate);
    }
    return mockAssignments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewMode, selectedDate, mockAssignments]);

  const currentStudent = students.find(s => s.email === user?.email);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
              <p className="text-gray-600 mt-2">View your daily assignments and homework from your teacher</p>
            </div>
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all shadow-md"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Student Info Banner */}
          {currentStudent && (
            <div className="rounded-xl shadow-md p-4 border-l-4" style={{ backgroundColor: '#f0fdf4', borderLeftColor: '#2E4D32' }}>
              <div className="flex items-center gap-4">
                <img src={currentStudent.avatar} alt={currentStudent.fullName} className="w-16 h-16 rounded-full" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentStudent.fullName}</h2>
                  <p className="text-sm text-gray-600">Program: <span className="font-semibold" style={{ color: '#2E4D32' }}>{currentStudent.program}</span></p>
                  <p className="text-sm text-gray-600">Teacher: {currentStudent.assignedTeacher}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Controls */}
        <Card>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  viewMode === 'current' ? 'text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={viewMode === 'current' ? { backgroundColor: '#2E4D32' } : {}}
                onClick={() => setViewMode('current')}
              >
                Today's Assignment
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  viewMode === 'history' ? 'text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={viewMode === 'history' ? { backgroundColor: '#2E4D32' } : {}}
                onClick={() => setViewMode('history')}
              >
                Assignment History
              </button>
            </div>

            {viewMode === 'current' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Date</label>
                <input
                  type="date"
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ outlineColor: '#2E4D32' }}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Assignments Display */}
        <div className="mt-6 space-y-6">
          {displayedAssignments.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Assignments Yet</h3>
                <p className="text-gray-600">Your teacher hasn't posted any assignments for this date.</p>
              </div>
            </Card>
          ) : (
            displayedAssignments.map((assignment, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border-2 overflow-hidden" style={{ borderColor: '#2E4D32' }}>
                {/* Assignment Header */}
                <div className="p-6 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 text-xs font-bold text-white rounded-full" style={{ backgroundColor: '#2E4D32' }}>
                          {new Date(assignment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Daily Assignment</h2>
                      <p className="text-sm text-gray-600 mt-1">Assigned by: <span className="font-semibold">{assignment.teacherName}</span></p>
                    </div>
                    <div className="text-right">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: '#E7AA39' }}>
                        {index + 1}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Classwork Section */}
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold mb-4" style={{ color: '#2E4D32' }}>📖 Today's Classwork</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-2">Sabq (New Lesson)</label>
                      <p className="text-base font-semibold text-gray-900">{assignment.sabq || 'Not assigned'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-2">Sabqi (Revision)</label>
                      <p className="text-base font-semibold text-gray-900">{assignment.sabqi || 'Not assigned'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-2">Manzil</label>
                      <p className="text-base font-semibold text-gray-900">{assignment.manzil || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>

                {/* Homework Section */}
                {assignment.homework && (
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold mb-3" style={{ color: '#E7AA39' }}>📝 Homework</h3>
                    <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
                      <p className="text-gray-900 whitespace-pre-wrap">{assignment.homework}</p>
                    </div>
                  </div>
                )}

                {/* Teacher Comment */}
                {assignment.comment && (
                  <div className="p-6" style={{ backgroundColor: '#fefdfb' }}>
                    <h3 className="text-lg font-bold mb-3" style={{ color: '#2E4D32' }}>💬 Teacher's Comment</h3>
                    <div className="rounded-lg p-4 border-l-4" style={{ backgroundColor: '#f0fdf4', borderLeftColor: '#2E4D32' }}>
                      <p className="text-gray-900 italic whitespace-pre-wrap">"{assignment.comment}"</p>
                      <p className="text-sm text-gray-600 mt-2">— {assignment.teacherName}</p>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="p-4 bg-gray-50 flex justify-end gap-2">
                  <button 
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                    onClick={() => window.print()}
                  >
                    Print Assignment
                  </button>
                  <button 
                    className="px-4 py-2 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                    style={{ backgroundColor: '#2E4D32' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#253d28'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E4D32'}
                  >
                    Mark as Completed
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <DebugPanel />
    </div>
  );
};

export default StudentAssignments;

