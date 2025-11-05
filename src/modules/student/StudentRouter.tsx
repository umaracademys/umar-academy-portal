import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import StudentAssignments from './pages/StudentAssignments';
import StudentCourses from './pages/StudentCourses';

const StudentRouter: React.FC = () => {
  console.log('🔍 StudentRouter - Component is rendering!');
  
  return (
    <Routes>
      <Route path="dashboard" element={<StudentDashboard />} />
      <Route path="profile" element={<StudentProfile />} />
      <Route path="assignments" element={<StudentAssignments />} />
      <Route path="courses" element={<StudentCourses />} />
      <Route path="progress" element={<div>Student Progress Page - Coming Soon</div>} />
      <Route path="payments" element={<div>Student Payments Page - Coming Soon</div>} />
      <Route path="messages" element={<div>Student Messages Page - Coming Soon</div>} />
      <Route path="" element={<StudentDashboard />} />
    </Routes>
  );
};

export default StudentRouter;
