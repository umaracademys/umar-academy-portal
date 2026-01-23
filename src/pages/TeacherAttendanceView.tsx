import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackendData } from '../contexts/BackendDataContext';
import { useToast } from '../hooks/useToast';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
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
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Access denied. Teacher access only.</p>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Attendance</h1>
              <p className="text-gray-600">View your attendance records shared by admin</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Shifts</div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalShifts}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Present</div>
                <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Absent</div>
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Present Rate</div>
                <div className="text-2xl font-bold text-blue-600">{stats.presentRate}%</div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="mt-4">
                <button
                  onClick={fetchAttendance}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Attendance Records */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Attendance Records ({attendanceRecords.length})
                </h2>
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading attendance records...</p>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No shared attendance records found.</p>
                  <p className="text-sm mt-2">Admin will share your attendance records with you.</p>
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherAttendanceView;
