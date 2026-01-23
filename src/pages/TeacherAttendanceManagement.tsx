import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { useToast } from '../hooks/useToast';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
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
  const [filterShift, setFilterShift] = useState<string>('all'); // 'all', 'morning', 'evening'

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
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Access denied. Admin privileges required.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Attendance Management</h1>
              <p className="text-gray-600">Manage and track teacher attendance records</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Teachers</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Range)</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Range)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="not_applicable">Not Applicable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift Filter</label>
                  <select
                    value={filterShift}
                    onChange={(e) => setFilterShift(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Shifts</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={fetchAttendance}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
                {selectedRecords.size > 0 && (
                  <>
                    <button
                      onClick={() => bulkShare(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Share Selected ({selectedRecords.size})
                    </button>
                    <button
                      onClick={() => bulkShare(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Unshare Selected ({selectedRecords.size})
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Clear Selection
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Attendance Records Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Attendance Records ({filteredRecords.length})
                </h2>
                {filteredRecords.length > 0 && (
                  <button
                    onClick={selectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading attendance records...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No attendance records found
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
                            className="rounded border-gray-300"
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
                                className="rounded border-gray-300"
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
                              <button
                                onClick={() => toggleShare(recordId, record.sharedWithTeacher || false)}
                                className={`px-3 py-1 rounded-md text-xs font-medium ${
                                  record.sharedWithTeacher
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                              >
                                {record.sharedWithTeacher ? 'Unshare' : 'Share'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherAttendanceManagement;
