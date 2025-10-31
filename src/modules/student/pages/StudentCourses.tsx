import React, { useState } from 'react';
import StudentHeader from '../components/StudentHeader';
import StudentSidebar from '../components/StudentSidebar';

const StudentCourses: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock data - in real app, this would come from API
  const courses = [
    {
      id: 1,
      title: 'Quran Recitation',
      instructor: 'Ustadh Ahmad',
      description: 'Learn proper Quran recitation with Tajweed rules',
      progress: 75,
      totalLessons: 20,
      completedLessons: 15,
      nextClass: '2024-02-12',
      status: 'active',
      schedule: 'Mon, Wed, Fri - 10:00 AM',
      materials: ['Quran Text', 'Tajweed Guide', 'Audio Recordings']
    },
    {
      id: 2,
      title: 'Arabic Language',
      instructor: 'Ustadh Ali',
      description: 'Comprehensive Arabic language course for beginners',
      progress: 45,
      totalLessons: 30,
      completedLessons: 13,
      nextClass: '2024-02-13',
      status: 'active',
      schedule: 'Tue, Thu - 2:00 PM',
      materials: ['Arabic Grammar Book', 'Workbook', 'Vocabulary Cards']
    },
    {
      id: 3,
      title: 'Hadith Studies',
      instructor: 'Ustadh Omar',
      description: 'Study of authentic hadiths and their meanings',
      progress: 100,
      totalLessons: 15,
      completedLessons: 15,
      nextClass: null,
      status: 'completed',
      schedule: 'Sat - 9:00 AM',
      materials: ['Sahih Bukhari', 'Hadith Commentary', 'Study Guide']
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Courses</h1>
              <p className="text-gray-600">Track your course progress and access materials</p>
            </div>

            {/* Course Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Courses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {courses.filter(c => c.status === 'active').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <span className="text-2xl">📈</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg. Progress</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Courses List */}
            <div className="space-y-6">
              {courses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
                          {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{course.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                        <span>👨‍🏫 {course.instructor}</span>
                        <span>📅 {course.schedule}</span>
                        {course.nextClass && <span>⏰ Next: {course.nextClass}</span>}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Progress</span>
                          <span className="text-sm font-medium text-gray-900">{course.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                          <span>{course.completedLessons} of {course.totalLessons} lessons completed</span>
                        </div>
                      </div>
                      
                      {/* Materials */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Course Materials:</h4>
                        <div className="flex flex-wrap gap-2">
                          {course.materials.map((material, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              📄 {material}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                        Continue Learning
                      </button>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                        View Materials
                      </button>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                        Contact Instructor
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      {course.status === 'completed' ? 'Completed' : 'In Progress'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {courses.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
                <p className="text-gray-600">You haven't been enrolled in any courses yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCourses;



