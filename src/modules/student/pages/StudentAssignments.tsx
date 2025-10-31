import React, { useState } from 'react';
import StudentHeader from '../components/StudentHeader';
import StudentSidebar from '../components/StudentSidebar';

const StudentAssignments: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');

  // Mock data - in real app, this would come from API
  const assignments = [
    {
      id: 1,
      title: 'Surah Al-Fatiha Memorization',
      course: 'Quran Recitation',
      instructor: 'Ustadh Ahmad',
      dueDate: '2024-02-15',
      status: 'pending',
      grade: null,
      description: 'Memorize Surah Al-Fatiha with proper Tajweed and submit a voice recording.',
      attachments: ['Surah Al-Fatiha Text.pdf', 'Tajweed Guide.pdf']
    },
    {
      id: 2,
      title: 'Tajweed Rules Quiz',
      course: 'Tajweed Basics',
      instructor: 'Ustadh Muhammad',
      dueDate: '2024-02-10',
      status: 'completed',
      grade: 92,
      description: 'Complete the quiz on basic Tajweed rules covered in class.',
      attachments: ['Quiz Instructions.pdf']
    },
    {
      id: 3,
      title: 'Arabic Grammar Exercise',
      course: 'Arabic Language',
      instructor: 'Ustadh Ali',
      dueDate: '2024-02-20',
      status: 'pending',
      grade: null,
      description: 'Complete exercises 1-10 from chapter 3 of the Arabic grammar book.',
      attachments: ['Grammar Book Chapter 3.pdf']
    },
    {
      id: 4,
      title: 'Hadith Memorization',
      course: 'Hadith Studies',
      instructor: 'Ustadh Omar',
      dueDate: '2024-02-05',
      status: 'overdue',
      grade: null,
      description: 'Memorize the first 5 hadiths from Sahih Bukhari.',
      attachments: ['Hadith Collection.pdf']
    }
  ];

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    return assignment.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader />
      
      <div className="flex">
        <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 lg:ml-64">
          <div className="p-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assignments</h1>
              <p className="text-gray-600">Track and manage your assignments</p>
            </div>

            {/* Filter Tabs */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                {[
                  { key: 'all', label: 'All', count: assignments.length },
                  { key: 'pending', label: 'Pending', count: assignments.filter(a => a.status === 'pending').length },
                  { key: 'completed', label: 'Completed', count: assignments.filter(a => a.status === 'completed').length },
                  { key: 'overdue', label: 'Overdue', count: assignments.filter(a => a.status === 'overdue').length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filter === tab.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Assignments List */}
            <div className="space-y-6">
              {filteredAssignments.map((assignment) => (
                <div key={assignment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {assignment.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <span>📚 {assignment.course}</span>
                        <span>👨‍🏫 {assignment.instructor}</span>
                        <span>📅 Due: {assignment.dueDate}</span>
                      </div>
                      <p className="text-gray-700 mb-4">{assignment.description}</p>
                      
                      {/* Attachments */}
                      {assignment.attachments.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Attachments:</h4>
                          <div className="flex flex-wrap gap-2">
                            {assignment.attachments.map((file, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                📎 {file}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                        {getStatusText(assignment.status)}
                      </span>
                      {assignment.grade && (
                        <span className="text-lg font-bold text-gray-900">
                          {assignment.grade}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      {assignment.status === 'pending' && (
                        <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                          Submit Assignment
                        </button>
                      )}
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                        View Details
                      </button>
                    </div>
                    
                    {assignment.status === 'completed' && (
                      <div className="text-sm text-gray-600">
                        Submitted on {assignment.dueDate}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredAssignments.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
                <p className="text-gray-600">
                  {filter === 'all' 
                    ? "You don't have any assignments yet." 
                    : `No ${filter} assignments found.`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAssignments;



