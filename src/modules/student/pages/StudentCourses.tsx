import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import StudentHeader from '../components/StudentHeader';
import StudentSidebar from '../components/StudentSidebar';

const StudentCourses: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { students, getStudentByEmail } = useData();
  
  const currentStudent = getStudentByEmail(user?.email || '') || students[0];
  const isAfterSchool = currentStudent?.program === 'After School';

  // Mock data - different courses for After School vs regular students
  const regularCourses = [
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

  const afterSchoolCourses = [
    {
      id: 1,
      title: 'Quran Reading',
      instructor: 'Ustadh Ahmad',
      description: 'Learn to read Quran with proper pronunciation and basic rules',
      progress: 60,
      totalLessons: 15,
      completedLessons: 9,
      nextClass: '2024-02-12',
      status: 'active',
      schedule: 'Mon, Wed, Fri - 4:00 PM',
      materials: ['Quran Text', 'Reading Guide', 'Practice Sheets']
    },
    {
      id: 2,
      title: 'Basic Arabic',
      instructor: 'Ustadh Ali',
      description: 'Introduction to Arabic alphabet and basic vocabulary',
      progress: 40,
      totalLessons: 20,
      completedLessons: 8,
      nextClass: '2024-02-13',
      status: 'active',
      schedule: 'Tue, Thu - 5:00 PM',
      materials: ['Arabic Alphabet Book', 'Workbook', 'Flashcards']
    }
  ];

  const courses = isAfterSchool ? afterSchoolCourses : regularCourses;

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
          <div className="p-2">
            {/* Header - Compact */}
            <div className="mb-2">
              <h1 className="text-lg font-bold text-gray-900">My Courses</h1>
            </div>

            {/* Course Stats - Compact */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-white rounded border border-gray-200 p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded">
                    <span className="text-xs">📚</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-gray-600">Total</p>
                    <p className="text-lg font-bold text-gray-900">{courses.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded border border-gray-200 p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-green-100 rounded">
                    <span className="text-xs">✅</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-gray-600">Active</p>
                    <p className="text-lg font-bold text-gray-900">
                      {courses.filter(c => c.status === 'active').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded border border-gray-200 p-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-purple-100 rounded">
                    <span className="text-xs">📈</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-gray-600">Progress</p>
                    <p className="text-lg font-bold text-gray-900">
                      {Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Courses List - Compact */}
            <div className="space-y-2">
              {courses.map((course) => (
                <div key={course.id} className="bg-white rounded border border-gray-200 p-2">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900">{course.title}</h3>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getStatusColor(course.status)}`}>
                          {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-gray-600 mb-1.5">{course.description}</p>
                      
                      <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1.5">
                        <span>{course.instructor}</span>
                        <span>•</span>
                        <span>{course.schedule}</span>
                      </div>
                      
                      {/* Progress Bar - Compact */}
                      <div className="mb-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-gray-700">Progress</span>
                          <span className="text-[10px] font-medium text-gray-900">{course.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-primary-600 h-1 rounded-full transition-all"
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                        <div className="text-[9px] text-gray-500 mt-0.5">
                          {course.completedLessons} of {course.totalLessons} lessons
                        </div>
                      </div>
                      
                      {/* Materials - Compact */}
                      <div className="mb-1.5">
                        <h4 className="text-[10px] font-medium text-gray-900 mb-1">Materials:</h4>
                        <div className="flex flex-wrap gap-1">
                          {course.materials.slice(0, 3).map((material, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-800"
                            >
                              {material}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
                    <div className="flex gap-1.5">
                      <button className="px-2 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700 transition-colors">
                        Continue
                      </button>
                      <button className="px-2 py-1 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50 transition-colors">
                        Materials
                      </button>
                    </div>
                    
                    <div className="text-[10px] text-gray-600">
                      {course.status === 'completed' ? 'Done' : 'Active'}
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



