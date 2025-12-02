import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Login from './pages/Login';

// Lazy load heavy components for code-splitting
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const TeacherProfile = lazy(() => import('./pages/TeacherProfile'));
const AssignmentManagement = lazy(() => import('./pages/AssignmentManagement'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const TeachersPage = lazy(() => import('./pages/TeachersPage'));
const MushafDemo = lazy(() => import('./pages/MushafDemo'));
const StudentRouter = lazy(() => import('./modules/student/StudentRouter'));
const ParentRegistrationForm = lazy(() => import('./pages/ParentRegistrationForm'));

// Loading component for Suspense
const LoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-primary font-semibold">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-primary font-semibold">Loading...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  console.log('🔍 DashboardRouter - user:', user);

  if (!user) {
    console.log('🔍 DashboardRouter - No user, redirecting to login');
    return <Navigate to="/login" />;
  }

  console.log('🔍 DashboardRouter - User role:', user.role);

  switch (user.role) {
    case 'superadmin':
      console.log('🔍 DashboardRouter - Rendering SuperAdminDashboard');
      return <SuperAdminDashboard />;
    case 'admin':
      console.log('🔍 DashboardRouter - Rendering AdminDashboard');
      return <AdminDashboard />;
    case 'teacher':
      console.log('🔍 DashboardRouter - Rendering TeacherDashboard');
      return <TeacherDashboard />;
    case 'student':
      console.log('🔍 DashboardRouter - Redirecting student to /student/dashboard');
      return <Navigate to="/student/dashboard" replace />;
    default:
      console.log('🔍 DashboardRouter - Unknown role, redirecting to login');
      return <Navigate to="/login" />;
  }
};

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Skip auth loading for demo page
  if (isLoading && location.pathname !== '/mushaf-demo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route 
          path="/mushaf-demo" 
          element={<MushafDemo />} 
        />
        <Route 
          path="/register" 
          element={<ParentRegistrationForm />} 
        />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <TeacherProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <ProtectedRoute>
              <AssignmentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers"
          element={
            <ProtectedRoute>
              <TeachersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/*"
          element={
            <ProtectedRoute>
              <StudentRouter />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
