import React, { useState } from 'react';
import { Admin, AdminPermissions } from '../types';
import { useData } from '../contexts/DataContext';
import Card from './Card';

interface AdminRegistrationFormProps {
  onClose: () => void;
}

const AdminRegistrationForm: React.FC<AdminRegistrationFormProps> = ({ onClose }) => {
  const { addAdmin, refreshData } = useData();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    contact: '',
    assignedPrograms: [] as string[],
  });

  const [permissions, setPermissions] = useState<AdminPermissions>({
    // People Operations
    canManageTeachers: true,
    canManageStudents: true,
    
    // Finance & Billing
    canManageFinancials: false,
    
    // Insights
    canViewReports: true,
    
    // Security & Governance
    canManagePermissions: false,
    
    // Module Permissions - Messages
    canAccessMessages: false,
    canViewAllMessages: false,
    canModerateMessages: false,
    
    // Module Permissions - PDF
    canAccessPdf: false,
    canManagePdfLibrary: false,
    canViewAllPdfAnnotations: false,
    
    // Module Permissions - Homework
    canAccessHomework: false,
    canManageHomework: false,
    canViewAllHomework: false,
    
    // Module Permissions - Evaluation
    canAccessEvaluations: false,
    canManageEvaluations: false,
    canApproveEvaluations: false,
    
    // Module Permissions - Tickets
    canAccessTickets: false,
    canCreateTickets: false,
    canReviewTickets: false,
    canApproveTickets: false,
    canFinalizeTickets: false,
    canManageTicketWorkflow: false,
    
    // Module Permissions - Attendance
    canAccessAttendance: false,
    canManageAttendance: false,
    canViewAttendanceReports: false,
    
    // Module Permissions - Recordings
    canAccessRecordings: false,
    canManageRecordings: false,
    canViewAllRecordings: false,
    
    // Module Permissions - Mushaf
    canAccessMushaf: false,
    canManageMushaf: false,
    canViewAllMistakes: false,
    
    // Module Permissions - Qaidah
    canAccessQaidah: false,
    canManageQaidah: false,
    canViewQaidahReports: false,
    
    // Module Permissions - Assignments
    canAccessAssignments: false,
    canManageAssignments: false,
    canBulkCreateAssignments: false,
    
    // Teacher-Student Assignment
    canManageStudentAssignments: false,
    
    // Notifications Module
    canManageNotifications: false,
    canViewNotifications: false,
    canSendNotifications: false,
    
    // Module Permissions - Reports & Analytics
    canViewAnalytics: false,
    canExportReports: false,
    canViewSystemStats: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const programs = ['Full-Time HQ', 'Part-Time HQ', 'After School'];

  const handleProgramToggle = (program: string) => {
    setFormData(prev => ({
      ...prev,
      assignedPrograms: prev.assignedPrograms.includes(program)
        ? prev.assignedPrograms.filter(p => p !== program)
        : [...prev.assignedPrograms, program]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    // Validation
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.contact.trim()) {
      setError('Contact number is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const newAdmin: Admin = {
        id: `ADM${Date.now()}`,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        contact: formData.contact.trim(),
        permissions: permissions,
        assignedDepartments: formData.assignedPrograms,
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName.trim())}&background=1F3224&color=fff`,
      };

      await addAdmin(newAdmin);
      
      // Refresh data to ensure UI updates
      if (refreshData) {
        await refreshData();
      }
      
      alert('Admin registered successfully!');
      onClose();
    } catch (err) {
      console.error('Error registering admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to register admin. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/90 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-white">Register New Admin</h2>
              <p className="text-accent text-sm mt-1 font-semibold">Add a new administrator with custom permissions</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <Card title="Basic Information" className="mb-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    setError(null);
                  }}
                  className="w-full px-4 py-2.5 border-2 border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-primary font-medium"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setError(null);
                  }}
                  className="w-full px-4 py-2.5 border-2 border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-primary font-medium"
                  placeholder="admin@umaracademy.org"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Contact Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.contact}
                  onChange={(e) => {
                    setFormData({ ...formData, contact: e.target.value });
                    setError(null);
                  }}
                  className="w-full px-4 py-2.5 border-2 border-primary rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-primary font-medium"
                  placeholder="+1-555-0000"
                />
              </div>
            </div>
          </Card>

          {/* Program Assignment */}
          <Card title="Program Assignment" className="mb-6">
            <p className="text-sm text-primary/70 mb-4">Select which programs this admin will manage:</p>
            <div className="flex flex-wrap gap-2">
              {programs.map(program => (
                <button
                  key={program}
                  type="button"
                  onClick={() => handleProgramToggle(program)}
                  className={`px-4 py-2 rounded-xl text-sm font-extrabold transition-all duration-200 border-2 ${
                    formData.assignedPrograms.includes(program)
                      ? 'bg-primary text-white border-primary shadow-lg'
                      : 'bg-soft-primary text-primary border-primary/30 hover:bg-primary/10'
                  }`}
                >
                  {program}
                </button>
              ))}
            </div>
          </Card>

          {/* Permissions */}
          <Card title="Permissions & Access Control" className="mb-6">
            <div className="bg-soft-primary p-4 rounded-xl space-y-3 border-2 border-primary/20">
              {Object.entries(permissions).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-primary/5 transition">
                  <div className="flex-1">
                    <span className="text-sm font-extrabold text-primary block mb-1">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <p className="text-xs text-primary/70">
                      {key === 'canManageTeachers' && 'Add, edit, and remove teachers'}
                      {key === 'canManageStudents' && 'Add, edit, and remove students'}
                      {key === 'canManageFinancials' && 'View and manage financial records'}
                      {key === 'canViewReports' && 'Access system reports and analytics'}
                      {key === 'canManagePermissions' && 'Modify permissions for other admins'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                    className="w-5 h-5 text-primary focus:ring-2 focus:ring-primary rounded border-2 border-primary cursor-pointer"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 p-3 bg-accent/10 border-2 border-accent/30 rounded-xl">
              <p className="text-xs text-primary font-semibold">
                <strong>Note:</strong> Only Super Admin can manage all permissions. Regular admins have limited access.
              </p>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t-2 border-primary/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 border-2 border-primary/30 rounded-xl hover:bg-soft-primary font-extrabold text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-extrabold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Registering...' : 'Register Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminRegistrationForm;
