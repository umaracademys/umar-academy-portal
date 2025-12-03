import React, { useState, useEffect, useMemo } from 'react';
import { TeacherAttendance, TeacherAttendanceStats, Teacher } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import TeacherAttendanceForm from './TeacherAttendanceForm';

interface TeacherAttendanceReportProps {
  onClose: () => void;
  teacherId?: string; // Optional, for filtering by teacher
}

const TeacherAttendanceReport: React.FC<TeacherAttendanceReportProps> = ({ onClose, teacherId }) => {
  const { teachers } = useData();
  const { user } = useAuth();
  const [attendances, setAttendances] = useState<TeacherAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>(teacherId || 'all');
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [viewMode, setViewMode] = useState<'dateRange' | 'month'>('month');
  const [stats, setStats] = useState<Record<string, TeacherAttendanceStats>>({});
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<string | null>(null);
  const [teacherDetailAttendances, setTeacherDetailAttendances] = useState<TeacherAttendance[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<TeacherAttendance | null>(null);
  const [deletingAttendanceId, setDeletingAttendanceId] = useState<string | null>(null);

  // Load attendance data
  useEffect(() => {
    loadAttendance();
  }, [selectedTeacher, startDate, endDate, selectedMonth, viewMode]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('umar_academy_token');
      let url = `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance?`;

      if (viewMode === 'month') {
        const [year, month] = selectedMonth.split('-');
        url += `month=${month}&year=${year}`;
      } else {
        url += `startDate=${startDate}&endDate=${endDate}`;
      }

      if (selectedTeacher !== 'all') {
        url += `&teacherId=${selectedTeacher}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data: TeacherAttendance[] = await response.json();
        if (import.meta.env.DEV) {
          console.log(`✅ Loaded ${data.length} attendance record(s) from API`);
          if (data.length > 0) {
            console.log('Sample attendance:', {
              teacherId: data[0].teacherId,
              teacherName: data[0].teacherName,
              date: data[0].date,
              employmentType: data[0].employmentType
            });
          }
        }
        setAttendances(data);

        // OPTIMIZED: Load stats for all teachers in parallel
        const teacherIds = [...new Set(data.map(a => a.teacherId))];
        const statsParams = viewMode === 'month' 
          ? `month=${selectedMonth.split('-')[1]}&year=${selectedMonth.split('-')[0]}`
          : `startDate=${startDate}&endDate=${endDate}`;
        
        // Fetch all stats in parallel
        const statsPromises = teacherIds.map(async (tid) => {
          try {
            const statsUrl = `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance/stats/${tid}?${statsParams}`;
            const statsResponse = await fetch(statsUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (statsResponse.ok) {
              const statsData: TeacherAttendanceStats = await statsResponse.json();
              return { teacherId: tid, stats: statsData };
            } else {
              console.warn(`⚠️ Could not load stats for teacher ${tid}:`, statsResponse.status);
              return { teacherId: tid, stats: null };
            }
          } catch (err) {
            console.warn(`⚠️ Error loading stats for teacher ${tid}:`, err);
            return { teacherId: tid, stats: null };
          }
        });

        // Wait for all stats to load in parallel
        const statsResults = await Promise.all(statsPromises);
        const statsMap: Record<string, TeacherAttendanceStats> = {};
        statsResults.forEach(({ teacherId, stats }) => {
          if (stats) {
            statsMap[teacherId] = stats;
          }
        });

        setStats(statsMap);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group attendances by teacher
  const groupedByTeacher = useMemo(() => {
    const grouped: Record<string, TeacherAttendance[]> = {};
    attendances.forEach(att => {
      if (!grouped[att.teacherId]) {
        grouped[att.teacherId] = [];
      }
      grouped[att.teacherId].push(att);
    });
    return grouped;
  }, [attendances]);

  // Calculate individual late arrival counts
  const lateArrivalCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    attendances.forEach(att => {
      if (!counts[att.teacherId]) {
        counts[att.teacherId] = 0;
      }
      
      if (att.employmentType === 'Full Time') {
        // Count morning shift late
        if (att.morningShift?.status === 'late') {
          counts[att.teacherId]++;
        }
        // Count evening shift late
        if (att.eveningShift?.status === 'late') {
          counts[att.teacherId]++;
        }
      } else {
        // Count part time shift late
        if (att.shift?.status === 'late') {
          counts[att.teacherId]++;
        }
      }
    });
    return counts;
  }, [attendances]);

  const loadTeacherDetail = async (teacherId: string) => {
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem('umar_academy_token');
      
      // teacherId from groupedByTeacher is already Teacher document _id from attendance records
      // But if it's from teachers list (clicked card), we need to resolve it
      let teacherIdForApi = teacherId;
      
      // Check if it's a User._id (from teachers list) or Teacher._id (from attendance)
      const teacher = teachers.find(t => t.id === teacherId);
      if (teacher) {
        // It's a User._id, resolve to Teacher document _id
        teacherIdForApi = (teacher as any).teacherDocumentId || 
                         (teacher as any)._id?.toString() || 
                         teacher.id;
      }
      // Otherwise, assume it's already Teacher document _id from attendance records
      
      let url = `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance/teacher/${teacherIdForApi}?`;

      if (viewMode === 'month') {
        const [year, month] = selectedMonth.split('-');
        url += `month=${month}&year=${year}`;
      } else {
        url += `startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data: TeacherAttendance[] = await response.json();
        setTeacherDetailAttendances(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`⚠️ Could not load teacher detail:`, response.status, errorData);
      }
    } catch (error) {
      console.warn('⚠️ Error loading teacher detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-yellow-100 text-yellow-800',
      'half-day': 'bg-orange-100 text-orange-800'
    };
    return colors[status as keyof typeof colors] || colors.absent;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleEdit = (attendance: TeacherAttendance) => {
    setEditingAttendance(attendance);
  };

  const handleDelete = async (attendanceId: string) => {
    if (!confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
      return;
    }

    setDeletingAttendanceId(attendanceId);
    try {
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance/${attendanceId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        // Reload attendance data
        loadAttendance();
        if (selectedTeacherForDetail) {
          loadTeacherDetail(selectedTeacherForDetail);
        }
        alert('Attendance record deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Error deleting attendance: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting attendance:', error);
      alert('Error deleting attendance record. Please try again.');
    } finally {
      setDeletingAttendanceId(null);
    }
  };

  const handleEditClose = () => {
    setEditingAttendance(null);
    // Reload attendance data after edit
    loadAttendance();
    if (selectedTeacherForDetail) {
      loadTeacherDetail(selectedTeacherForDetail);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Teacher', 'Employment Type', 'Morning Status', 'Evening Status', 'Shift Status', 'Paid Days', 'Is Paid'];
    const rows = attendances.map(att => {
      const teacher = teachers.find(t => t.id === att.teacherId);
      return [
        att.date,
        att.teacherName,
        att.employmentType,
        att.morningShift?.status || 'N/A',
        att.eveningShift?.status || 'N/A',
        att.shift?.status || 'N/A',
        att.paidDays.toString(),
        att.isPaid ? 'Yes' : 'No'
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-attendance-${selectedMonth || startDate}.csv`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full my-8 border-2 border-primary">
        <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] p-6 rounded-t-lg">
          <h2 className="text-2xl font-extrabold text-accent">Teacher Attendance Report</h2>
          <p className="text-accent/90 text-sm mt-1">View attendance history and statistics</p>
        </div>

        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-extrabold text-primary mb-2">View Mode</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'dateRange' | 'month')}
                className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
              >
                <option value="month">By Month</option>
                <option value="dateRange">Date Range</option>
              </select>
            </div>

            {viewMode === 'month' ? (
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-extrabold text-primary mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-primary mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-extrabold text-primary mb-2">Teacher</label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
              >
                <option value="all">All Teachers</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Export Button */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-accent text-primary rounded-lg hover:bg-accent/90 font-extrabold shadow-lg"
            >
              📥 Export to CSV
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-primary">Loading attendance data...</p>
            </div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-8 text-primary">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-xl font-extrabold mb-2">No attendance records found</p>
                <p className="text-primary/70 mb-4">
                  {viewMode === 'month' 
                    ? `No attendance has been recorded for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`
                    : `No attendance has been recorded between ${new Date(startDate).toLocaleDateString()} and ${new Date(endDate).toLocaleDateString()}.`}
                </p>
                <div className="bg-soft-primary border-2 border-primary rounded-lg p-4 mt-4">
                  <p className="text-sm font-semibold text-primary mb-2">💡 To get started:</p>
                  <ol className="text-sm text-primary/80 text-left list-decimal list-inside space-y-1">
                    <li>Go to the dashboard</li>
                    <li>Click "Take Teacher Attendance"</li>
                    <li>Select a date and record attendance for teachers</li>
                    <li>Return here to view the reports</li>
                  </ol>
                </div>
                <p className="text-xs text-primary/60 mt-4">
                  Tip: Try selecting a different month or date range if you've already recorded attendance.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Statistics */}
              {Object.keys(groupedByTeacher).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(groupedByTeacher).map(([teacherId, records]) => {
                    // teacherId from attendance records is Teacher document _id
                    // Find teacher by matching Teacher document _id
                    const teacher = teachers.find(t => {
                      const teacherDocId = (t as any).teacherDocumentId || (t as any)._id?.toString();
                      return teacherDocId === teacherId || t.id === teacherId;
                    });
                    const teacherStats = stats[teacherId];
                    if (!teacher) return null;

                    const lateCount = lateArrivalCounts[teacherId] || 0;
                    
                    return (
                      <div 
                        key={teacherId} 
                        className="border-2 border-primary rounded-lg p-4 bg-soft-primary cursor-pointer hover:bg-soft-accent transition-all hover:shadow-lg"
                        onClick={() => {
                          setSelectedTeacherForDetail(teacherId);
                          loadTeacherDetail(teacherId);
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-extrabold text-primary text-lg">{teacher.fullName}</h3>
                          <span className="text-xs text-primary/70 bg-white px-2 py-1 rounded">Click to view details</span>
                        </div>
                        {teacherStats ? (
                          <div className="space-y-1 text-sm">
                            <p><span className="font-semibold">Total Records:</span> {teacherStats.totalRecords}</p>
                            <p><span className="font-semibold">Total Shifts:</span> {teacherStats.totalShifts}</p>
                            <p><span className="font-semibold">Present:</span> {teacherStats.totalPresent}</p>
                            <p><span className="font-semibold">Absent:</span> {teacherStats.totalAbsent}</p>
                            <p className="font-semibold text-yellow-700">
                              <span className="font-extrabold">Late Arrivals:</span> {lateCount} {lateCount === 1 ? 'time' : 'times'}
                            </p>
                            <p><span className="font-semibold">Half Day:</span> {teacherStats.totalHalfDay}</p>
                            <p><span className="font-semibold">Paid Days:</span> {teacherStats.totalPaidDays}</p>
                            <p><span className="font-semibold">Present Rate:</span> {teacherStats.presentRate.toFixed(1)}%</p>
                          </div>
                        ) : (
                          <p className="text-sm text-primary/70">Loading statistics...</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Late Arrivals Summary */}
              {Object.keys(lateArrivalCounts).length > 0 && (
                <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                  <h3 className="font-extrabold text-primary text-lg mb-4">📊 Late Arrivals Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(lateArrivalCounts)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([teacherId, count]) => {
                        const teacher = teachers.find(t => t.id === teacherId);
                        const lateCount = count as number;
                        if (!teacher || lateCount === 0) return null;
                        return (
                          <div key={teacherId} className="bg-white border-2 border-yellow-300 rounded-lg p-3">
                            <p className="font-extrabold text-primary">{teacher.fullName}</p>
                            <p className="text-yellow-700 font-semibold">
                              {lateCount} {lateCount === 1 ? 'late arrival' : 'late arrivals'}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Detailed Records */}
              <div className="border-2 border-primary rounded-lg overflow-hidden">
                <div className="bg-primary text-accent p-4 font-extrabold">
                  Detailed Attendance Records
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-soft-primary">
                      <tr>
                        <th className="px-4 py-2 text-left text-primary font-extrabold">Date</th>
                        <th className="px-4 py-2 text-left text-primary font-extrabold">Teacher</th>
                        <th className="px-4 py-2 text-left text-primary font-extrabold">Type</th>
                        <th className="px-4 py-2 text-left text-primary font-extrabold">Morning</th>
                        <th className="px-4 py-2 text-left text-primary font-extrabold">Evening</th>
                        <th className="px-4 py-2 text-left text-primary font-extrabold">Shift</th>
                        <th className="px-4 py-2 text-left text-primary font-extrabold">Check In Times</th>
                        <th className="px-4 py-2 text-left text-primary font-extrabold">Paid Days</th>
                        <th className="px-4 py-2 text-left text-primary font-extrabold">Paid</th>
                        <th className="px-4 py-2 text-left text-primary font-extrabold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendances
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((att, idx) => {
                          // Get check-in times
                          const morningCheckIn = att.morningShift?.checkIn || '';
                          const eveningCheckIn = att.eveningShift?.checkIn || '';
                          const shiftCheckIn = att.shift?.checkIn || '';
                          const checkInTimes = att.employmentType === 'Full Time' 
                            ? `${morningCheckIn || '—'} / ${eveningCheckIn || '—'}`
                            : shiftCheckIn || '—';
                          
                          return (
                            <tr key={idx} className="border-b border-primary/20 hover:bg-soft-primary">
                              <td className="px-4 py-2 text-primary">{formatDate(att.date)}</td>
                              <td className="px-4 py-2 text-primary font-semibold">{att.teacherName}</td>
                              <td className="px-4 py-2 text-primary">{att.employmentType}</td>
                              <td className="px-4 py-2">
                                {att.morningShift ? (
                                  <div className="flex flex-col gap-1">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(att.morningShift.status)}`}>
                                      {att.morningShift.status}
                                    </span>
                                    {att.morningShift.checkIn && (
                                      <span className="text-xs text-primary/70">{att.morningShift.checkIn}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-primary/50">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                {att.eveningShift ? (
                                  <div className="flex flex-col gap-1">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(att.eveningShift.status)}`}>
                                      {att.eveningShift.status}
                                    </span>
                                    {att.eveningShift.checkIn && (
                                      <span className="text-xs text-primary/70">{att.eveningShift.checkIn}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-primary/50">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                {att.shift ? (
                                  <div className="flex flex-col gap-1">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(att.shift.status)}`}>
                                      {att.shift.status}
                                    </span>
                                    {att.shift.checkIn && (
                                      <span className="text-xs text-primary/70">{att.shift.checkIn}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-primary/50">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-primary text-sm">
                                {checkInTimes}
                              </td>
                              <td className="px-4 py-2 text-primary">{att.paidDays}</td>
                              <td className="px-4 py-2">
                                {att.isPaid ? (
                                  <span className="text-green-600 font-semibold">✓</span>
                                ) : (
                                  <span className="text-red-600 font-semibold">✗</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEdit(att)}
                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-semibold"
                                    title="Edit attendance"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete((att as any)._id || att.id)}
                                    disabled={deletingAttendanceId === ((att as any)._id || att.id)}
                                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                                    title="Delete attendance"
                                  >
                                    {deletingAttendanceId === att.id ? '⏳ Deleting...' : '🗑️ Delete'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t-2 border-primary">
          <button
            onClick={onClose}
            className="px-6 py-2 border-2 border-primary rounded-lg hover:bg-primary/10 font-extrabold text-primary shadow-lg"
          >
            Close
          </button>
        </div>
      </div>

      {/* Teacher Detail Modal */}
      {selectedTeacherForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full my-8 border-2 border-primary max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-extrabold text-accent">
                    {teachers.find(t => t.id === selectedTeacherForDetail)?.fullName}'s Attendance History
                  </h2>
                  <p className="text-accent/90 text-sm mt-1">
                    {viewMode === 'month' 
                      ? `Month: ${selectedMonth}` 
                      : `${startDate} to ${endDate}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTeacherForDetail(null)}
                  className="w-10 h-10 flex items-center justify-center bg-accent text-primary rounded-full hover:bg-accent/90 font-bold text-xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetail ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-primary">Loading attendance history...</p>
                </div>
              ) : teacherDetailAttendances.length === 0 ? (
                <div className="text-center py-8 text-primary">
                  <p>No attendance records found for this teacher in the selected period.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  {stats[selectedTeacherForDetail] && (
                    <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary mb-4">
                      <h3 className="font-extrabold text-primary text-lg mb-3">Summary Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-primary/70">Total Records</p>
                          <p className="font-extrabold text-primary text-lg">{stats[selectedTeacherForDetail].totalRecords}</p>
                        </div>
                        <div>
                          <p className="text-primary/70">Present</p>
                          <p className="font-extrabold text-green-700 text-lg">{stats[selectedTeacherForDetail].totalPresent}</p>
                        </div>
                        <div>
                          <p className="text-primary/70">Absent</p>
                          <p className="font-extrabold text-red-700 text-lg">{stats[selectedTeacherForDetail].totalAbsent}</p>
                        </div>
                        <div>
                          <p className="text-primary/70">Present Rate</p>
                          <p className="font-extrabold text-primary text-lg">{stats[selectedTeacherForDetail].presentRate.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed History Table */}
                  <div className="border-2 border-primary rounded-lg overflow-hidden">
                    <div className="bg-primary text-accent p-4 font-extrabold">
                      Daily Attendance History
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-soft-primary">
                          <tr>
                            <th className="px-4 py-2 text-left text-primary font-extrabold">Date</th>
                            <th className="px-4 py-2 text-left text-primary font-extrabold">Morning Shift</th>
                            <th className="px-4 py-2 text-left text-primary font-extrabold">Evening Shift</th>
                            <th className="px-4 py-2 text-left text-primary font-extrabold">Shift</th>
                            <th className="px-4 py-2 text-left text-primary font-extrabold">Check In/Out</th>
                            <th className="px-4 py-2 text-left text-primary font-extrabold">Paid Days</th>
                            <th className="px-4 py-2 text-left text-primary font-extrabold">Notes</th>
                            <th className="px-4 py-2 text-left text-primary font-extrabold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacherDetailAttendances
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map((att, idx) => (
                              <tr key={idx} className="border-b border-primary/20 hover:bg-soft-primary">
                                <td className="px-4 py-2 text-primary font-semibold">{formatDate(att.date)}</td>
                                <td className="px-4 py-2">
                                  {att.morningShift ? (
                                    <div className="flex flex-col gap-1">
                                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(att.morningShift.status)}`}>
                                        {att.morningShift.status}
                                      </span>
                                      {att.morningShift.checkIn && (
                                        <span className="text-xs text-primary/70">
                                          {att.morningShift.checkIn} - {att.morningShift.checkOut || 'N/A'}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-primary/50">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {att.eveningShift ? (
                                    <div className="flex flex-col gap-1">
                                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(att.eveningShift.status)}`}>
                                        {att.eveningShift.status}
                                      </span>
                                      {att.eveningShift.checkIn && (
                                        <span className="text-xs text-primary/70">
                                          {att.eveningShift.checkIn} - {att.eveningShift.checkOut || 'N/A'}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-primary/50">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {att.shift ? (
                                    <div className="flex flex-col gap-1">
                                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(att.shift.status)}`}>
                                        {att.shift.status}
                                      </span>
                                      {att.shift.checkIn && (
                                        <span className="text-xs text-primary/70">
                                          {att.shift.checkIn} - {att.shift.checkOut || 'N/A'}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-primary/50">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-primary text-sm">
                                  {att.employmentType === 'Full Time' 
                                    ? `${att.morningShift?.checkIn || '—'} / ${att.eveningShift?.checkIn || '—'}`
                                    : att.shift?.checkIn || '—'}
                                </td>
                                <td className="px-4 py-2 text-primary">{att.paidDays || 0}</td>
                                <td className="px-4 py-2 text-primary text-xs max-w-xs truncate">
                                  {att.morningShift?.notes || att.eveningShift?.notes || att.shift?.notes || '—'}
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEdit(att)}
                                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-semibold"
                                      title="Edit attendance"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete((att as any)._id || att.id)}
                                      disabled={deletingAttendanceId === ((att as any)._id || att.id)}
                                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                                      title="Delete attendance"
                                    >
                                      {deletingAttendanceId === att.id ? '⏳ Deleting...' : '🗑️ Delete'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal */}
      {editingAttendance && (
        <TeacherAttendanceForm
          onClose={handleEditClose}
          attendanceToEdit={editingAttendance}
        />
      )}
    </div>
  );
};

export default TeacherAttendanceReport;

