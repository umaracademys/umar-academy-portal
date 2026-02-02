import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { useToast } from '../hooks/useToast';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import { TeacherAttendance } from '../types';

const TeacherAttendanceView: React.FC = () => {
  const { user } = useAuth();
  const { refreshDataLight } = useBackendData();
  const { showToast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<TeacherAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [teacherId, setTeacherId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

  // Get teacher ID from user
  useEffect(() => {
    const fetchTeacherId = async () => {
      try {
        const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
        if (!token) return;

        // Get teacher profile to find teacher ID
        const response = await fetch(`${API_BASE}/teachers`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const teachers = await response.json();
          const teacher = teachers.find((t: any) => 
            t.userId === user?.userId || t.email === user?.email
          );
          
          if (teacher) {
            const tid = teacher._id?.toString() || teacher.teacherDocumentId || teacher.id;
            setTeacherId(tid);
          }
        }
      } catch (error) {
        console.error('Error fetching teacher ID:', error);
      }
    };

    if (user?.role === 'teacher') {
      fetchTeacherId();
    }
  }, [user]);

  // Fetch attendance records
  const fetchAttendance = async () => {
    if (!teacherId) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      let url = `${API_BASE}/teacher-attendance/teacher/${teacherId}?`;
      const params = new URLSearchParams();
      
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else {
        params.append('date', selectedDate);
      }
      
      url += params.toString();
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance');
      }

      const data = await response.json();
      // Filter to only show shared records
      const sharedRecords = (data || []).filter((record: TeacherAttendance) => record.sharedWithTeacher);
      setAttendanceRecords(sharedRecords);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      showToast(error.message || 'Failed to fetch attendance', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId && user?.role === 'teacher') {
      fetchAttendance();
    }
  }, [teacherId, selectedDate, startDate, endDate]);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'not_applicable': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const isFullTime = attendanceRecords.some(r => r.employmentType === 'Full Time');
    let totalShifts = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let notApplicable = 0;

    attendanceRecords.forEach(record => {
      if (record.employmentType === 'Full Time') {
        if (record.morningShift) {
          totalShifts++;
          if (record.morningShift.status === 'present') present++;
          else if (record.morningShift.status === 'absent') absent++;
          else if (record.morningShift.status === 'late') late++;
          else if (record.morningShift.status === 'not_applicable') notApplicable++;
        }
        if (record.eveningShift) {
          totalShifts++;
          if (record.eveningShift.status === 'present') present++;
          else if (record.eveningShift.status === 'absent') absent++;
          else if (record.eveningShift.status === 'late') late++;
          else if (record.eveningShift.status === 'not_applicable') notApplicable++;
        }
      } else if (record.shift) {
        totalShifts++;
        if (record.shift.status === 'present') present++;
        else if (record.shift.status === 'absent') absent++;
        else if (record.shift.status === 'late') late++;
        else if (record.shift.status === 'not_applicable') notApplicable++;
      }
    });

    return {
      totalShifts,
      present,
      absent,
      late,
      notApplicable,
      presentRate: totalShifts > 0 ? Math.round((present / totalShifts) * 100) : 0
    };
  }, [attendanceRecords]);

  if (user?.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
        <AppLayout
          sidebar={
            <Sidebar
              activeSection="my-attendance"
              onSectionChange={() => {}}
              isMobileOpen={sidebarOpen}
              onMobileToggle={() => setSidebarOpen((o) => !o)}
              onMobileClose={() => setSidebarOpen(false)}
            />
          }
          sidebarOpen={sidebarOpen}
          onOverlayClick={() => setSidebarOpen(false)}
          maxWidth="7xl"
        >
          <div className="p-4">
            <p className="body-text font-medium text-red-600">Access denied. Teacher access only.</p>
          </div>
        </AppLayout>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
      <AppLayout
        sidebar={
          <Sidebar
            activeSection="my-attendance"
            onSectionChange={() => {}}
            isMobileOpen={sidebarOpen}
            onMobileToggle={() => setSidebarOpen((o) => !o)}
            onMobileClose={() => setSidebarOpen(false)}
          />
        }
        sidebarOpen={sidebarOpen}
        onOverlayClick={() => setSidebarOpen(false)}
        maxWidth="7xl"
      >
      <section className="space-y-4">
        <div>
          <h1 className="heading-page text-gray-900">My attendance</h1>
          <p className="caption mt-1">
            View records shared with you by admin
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
          <h2 className="heading-card mb-3">Choose date or range</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block body-text font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block body-text font-medium text-gray-700 mb-1">From (range)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block body-text font-medium text-gray-700 mb-1">To (range)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="primary"
              size="md"
              onClick={fetchAttendance}
              disabled={isLoading}
              fullWidthMobile
              className="min-h-[44px]"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="heading-section">Records ({attendanceRecords.length})</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              <p className="body-text text-gray-600 mt-3">Loading...</p>
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="p-8 text-center">
              <p className="body-text text-gray-900">No records yet</p>
              <p className="caption mt-1">Admin will share your attendance with you when it’s ready.</p>
            </div>
          ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Morning Shift
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Evening Shift
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRecords.map((record) => {
                        const isFullTime = record.employmentType === 'Full Time';
                        
                        return (
                          <tr key={record._id || record.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {isFullTime && record.morningShift ? (
                                <div>
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.morningShift.status)}`}>
                                    {record.morningShift.status === 'late' 
                                      ? `Late (${record.morningShift.lateMinutes || 0}m)`
                                      : record.morningShift.status.replace('_', ' ')}
                                  </span>
                                  {record.morningShift.checkIn && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {record.morningShift.checkIn} - {record.morningShift.checkOut || 'N/A'}
                                    </div>
                                  )}
                                  {record.morningShift.notes && (
                                    <div className="text-xs text-gray-500 mt-1 italic">
                                      {record.morningShift.notes}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {isFullTime && record.eveningShift ? (
                                <div>
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.eveningShift.status)}`}>
                                    {record.eveningShift.status === 'late' 
                                      ? `Late (${record.eveningShift.lateMinutes || 0}m)`
                                      : record.eveningShift.status.replace('_', ' ')}
                                  </span>
                                  {record.eveningShift.checkIn && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {record.eveningShift.checkIn} - {record.eveningShift.checkOut || 'N/A'}
                                    </div>
                                  )}
                                  {record.eveningShift.notes && (
                                    <div className="text-xs text-gray-500 mt-1 italic">
                                      {record.eveningShift.notes}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {record.morningShift?.notes || record.eveningShift?.notes || record.shift?.notes || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
        </div>
      </section>
      </AppLayout>
    </div>
  );
};

export default TeacherAttendanceView;
