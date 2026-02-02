import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { useToast } from '../hooks/useToast';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import { Teacher, TeacherAttendance } from '../types';

const TeacherAttendanceManagement: React.FC = () => {
  const { user } = useAuth();
  const { teachers, refreshDataLight } = useBackendData();
  const { showToast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<TeacherAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    if (selectedTeacherId === 'all') return teachers;
    return teachers.filter(t => {
      const tid = (t as any)._id?.toString() || (t as any).teacherDocumentId || t.id;
      return tid === selectedTeacherId;
    });
  }, [teachers, selectedTeacherId]);

  // Fetch attendance records
  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      let url = `${API_BASE}/teacher-attendance?`;
      const params = new URLSearchParams();
      
      if (selectedTeacherId !== 'all') {
        params.append('teacherId', selectedTeacherId);
      }
      
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
      setAttendanceRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      showToast(error.message || 'Failed to fetch attendance', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      fetchAttendance();
    }
  }, [selectedDate, selectedTeacherId, startDate, endDate]);

  // Share/unshare attendance with teacher
  const toggleShare = async (attendanceId: string, currentShareStatus: boolean) => {
    try {
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`${API_BASE}/teacher-attendance/${attendanceId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ share: !currentShareStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to share attendance');
      }

      showToast(currentShareStatus ? 'Attendance unshared' : 'Attendance shared with teacher', 'success');
      fetchAttendance();
    } catch (error: any) {
      console.error('Error sharing attendance:', error);
      showToast(error.message || 'Failed to share attendance', 'error');
    }
  };

  // Bulk share/unshare
  const bulkShare = async (share: boolean) => {
    if (selectedRecords.size === 0) {
      showToast('Please select attendance records', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('umar_academy_token') || localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`${API_BASE}/teacher-attendance/bulk-share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendanceIds: Array.from(selectedRecords),
          share
        })
      });

      if (!response.ok) {
        throw new Error('Failed to bulk share attendance');
      }

      showToast(`${selectedRecords.size} records ${share ? 'shared' : 'unshared'}`, 'success');
      setSelectedRecords(new Set());
      fetchAttendance();
    } catch (error: any) {
      console.error('Error bulk sharing:', error);
      showToast(error.message || 'Failed to bulk share', 'error');
    }
  };

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

  // Filter records
  const filteredRecords = useMemo(() => {
    let filtered = attendanceRecords;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(record => {
        if (record.employmentType === 'Full Time') {
          return record.morningShift?.status === filterStatus || record.eveningShift?.status === filterStatus;
        } else {
          return record.shift?.status === filterStatus;
        }
      });
    }
    
    if (filterShift !== 'all') {
      filtered = filtered.filter(record => {
        if (record.employmentType === 'Full Time') {
          if (filterShift === 'morning') {
            return record.morningShift && record.morningShift.status !== 'not_applicable';
          } else if (filterShift === 'evening') {
            return record.eveningShift && record.eveningShift.status !== 'not_applicable';
          }
        }
        return true;
      });
    }
    
    return filtered;
  }, [attendanceRecords, filterStatus, filterShift]);

  // Toggle record selection
  const toggleRecordSelection = (id: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecords(newSelected);
  };

  // Select all visible records
  const selectAll = () => {
    const allIds = new Set(filteredRecords.map(r => r._id || r.id).filter(Boolean) as string[]);
    setSelectedRecords(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedRecords(new Set());
  };

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
        <AppLayout
          sidebar={
            <Sidebar
              activeSection="teacher-attendance"
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
            <p className="body-text font-medium text-red-600">Access denied. Admin access only.</p>
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
            activeSection="teacher-attendance"
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
          <h1 className="heading-page text-gray-900">Teacher attendance</h1>
          <p className="caption mt-1">View and share attendance records with teachers</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
          <h2 className="heading-card mb-3">Date and filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block body-text font-medium text-gray-700 mb-1">Teacher</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="all">All teachers</option>
                {teachers.map(teacher => {
                  const tid = (teacher as any)._id?.toString() || (teacher as any).teacherDocumentId || teacher.id;
                  return (
                    <option key={tid} value={tid}>
                      {teacher.fullName}
                    </option>
                  );
                })}
              </select>
            </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block body-text font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="all">All</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="not_applicable">Not applicable</option>
              </select>
            </div>
            <div>
              <label className="block body-text font-medium text-gray-700 mb-1">Shift</label>
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg body-text bg-white focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="all">All</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
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
            {selectedRecords.size > 0 && (
              <>
                <Button variant="outline" size="md" onClick={() => bulkShare(true)} className="min-h-[44px]">
                  Share selected ({selectedRecords.size})
                </Button>
                <Button variant="outline" size="md" onClick={() => bulkShare(false)} className="min-h-[44px]">
                  Unshare selected
                </Button>
                <Button variant="outline" size="md" onClick={clearSelection} className="min-h-[44px]">
                  Clear selection
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h2 className="heading-section">Records ({filteredRecords.length})</h2>
            {filteredRecords.length > 0 && (
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select all
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              <p className="body-text text-gray-600 mt-3">Loading...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center">
              <p className="body-text text-gray-900">No records found</p>
              <p className="caption mt-1">Try a different date or teacher</p>
            </div>
          ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedRecords.size === filteredRecords.length && filteredRecords.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) selectAll();
                              else clearSelection();
                            }}
                            className="rounded border-gray-300 w-4 h-4 min-w-[20px] min-h-[20px]"
                            aria-label="Select all"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Teacher
                        </th>
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
                          Shared
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRecords.map((record) => {
                        const recordId = record._id || record.id || '';
                        const isSelected = selectedRecords.has(recordId);
                        const isFullTime = record.employmentType === 'Full Time';
                        
                        return (
                          <tr key={recordId} className={isSelected ? 'bg-blue-50' : ''}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRecordSelection(recordId)}
                                className="rounded border-gray-300 w-4 h-4 min-w-[20px] min-h-[20px]"
                                aria-label={`Select record ${record.teacherName} ${record.date}`}
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{record.teacherName}</div>
                              <div className="text-xs text-gray-500">{record.employmentType}</div>
                            </td>
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
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {record.sharedWithTeacher ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Shared
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Not Shared
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <Button
                                variant={record.sharedWithTeacher ? 'outline' : 'primary'}
                                size="sm"
                                onClick={() => toggleShare(recordId, record.sharedWithTeacher || false)}
                              >
                                {record.sharedWithTeacher ? 'Unshare' : 'Share'}
                              </Button>
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

export default TeacherAttendanceManagement;
