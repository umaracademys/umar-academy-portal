import React from 'react';
import { Routes, Route } from 'react-router-dom';
import StudentDashboard from './pages/StudentDashboard';
import StudentDashboardDebug from './pages/StudentDashboardDebug';
import StudentTest from './pages/StudentTest';
import StudentTestPage from './pages/StudentTestPage';
import StudentProfile from './pages/StudentProfile';
import StudentAssignments from './pages/StudentAssignments';
import StudentCourses from './pages/StudentCourses';

const StudentRouter: React.FC = () => {
  console.log('🔍 StudentRouter - Component is rendering!');
  
  return (
    <Routes>
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/profile" element={<StudentProfile />} />
      <Route path="/student/assignments" element={<StudentAssignments />} />
      <Route path="/student/courses" element={<StudentCourses />} />
      <Route path="/student/progress" element={<div>Student Progress Page - Coming Soon</div>} />
      <Route path="/student/payments" element={<div>Student Payments Page - Coming Soon</div>} />
      <Route path="/student/messages" element={<div>Student Messages Page - Coming Soon</div>} />
    </Routes>
  );
};

export default StudentRouter;
