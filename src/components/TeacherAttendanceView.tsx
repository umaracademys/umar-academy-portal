import React, { useState, useEffect } from 'react';
import { TeacherAttendance, TeacherAttendanceStats } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface TeacherAttendanceViewProps {
  teacherId: string;
  onClose?: () => void;
}

const TeacherAttendanceView: React.FC<TeacherAttendanceViewProps> = ({ teacherId, onClose }) => {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState<TeacherAttendance[]>([]);
  const [stats, setStats] = useState<TeacherAttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  useEffect(() => {
    loadAttendance();
    loadStats();
  }, [selectedMonth, teacherId]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('umar_academy_token');
      const [year, month] = selectedMonth.split('-');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance/teacher/${teacherId}?month=${month}&year=${year}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data: TeacherAttendance[] = await response.json();
        setAttendances(data);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('umar_academy_token');
      const [year, month] = selectedMonth.split('-');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/teacher-attendance/stats/${teacherId}?month=${month}&year=${year}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data: TeacherAttendanceStats = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      present: 'bg-green-100 text-green-800 border-green-300',
      absent: 'bg-red-100 text-red-800 border-red-300',
      late: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'half-day': 'bg-orange-100 text-orange-800 border-orange-300'
    };
    return colors[status as keyof typeof colors] || colors.absent;
  };

  const formatDate = (dateStr: string) => {
    // Parse date string (YYYY-MM-DD) directly to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className={`${onClose ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto' : ''}`}>
      <div className={`bg-white rounded-lg shadow-2xl ${onClose ? 'max-w-6xl w-full my-8' : 'w-full'} border-2 border-primary`}>
        {onClose && (
          <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] p-6 rounded-t-lg">
            <h2 className="text-2xl font-extrabold text-accent">My Attendance</h2>
            <p className="text-accent/90 text-sm mt-1">View your attendance history</p>
          </div>
        )}

        <div className="p-6">
          {/* Month Selector */}
          <div className="mb-6">
            <label className="block text-sm font-extrabold text-primary mb-2">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-primary">Loading attendance data...</p>
            </div>
          ) : (
            <>
              {/* Statistics Summary */}
              {stats && (
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary text-center">
                    <div className="text-2xl font-extrabold text-primary">{stats.totalPresent}</div>
                    <div className="text-sm text-primary/70">Present</div>
                  </div>
                  <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary text-center">
                    <div className="text-2xl font-extrabold text-primary">{stats.totalAbsent}</div>
                    <div className="text-sm text-primary/70">Absent</div>
                  </div>
                  <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary text-center">
                    <div className="text-2xl font-extrabold text-primary">{stats.totalLate}</div>
                    <div className="text-sm text-primary/70">Late</div>
                  </div>
                  <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary text-center">
                    <div className="text-2xl font-extrabold text-primary">{stats.presentRate.toFixed(1)}%</div>
                    <div className="text-sm text-primary/70">Present Rate</div>
                  </div>
                  <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary text-center col-span-2 md:col-span-4">
                    <div className="text-lg font-extrabold text-primary">Total Paid Days: {stats.totalPaidDays}</div>
                  </div>
                </div>
              )}

              {/* Attendance Calendar View */}
              {attendances.length === 0 ? (
                <div className="text-center py-8 text-primary">
                  <p>No attendance records found for {selectedMonth}.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-lg font-extrabold text-primary mb-4">Daily Attendance</h3>
                  {attendances
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((att, idx) => (
                      <div
                        key={idx}
                        className="border-2 border-primary rounded-lg p-4 bg-soft-primary"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-extrabold text-primary text-lg">{formatDate(att.date)}</h4>
                            <p className="text-sm text-primary/70">{att.employmentType}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-primary">
                              <span className="font-semibold">Paid Days:</span> {att.paidDays}
                            </div>
                            {att.isPaid && (
                              <span className="text-green-600 font-semibold text-sm">✓ Paid</span>
                            )}
                          </div>
                        </div>

                        {att.employmentType === 'Full Time' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Morning Shift */}
                            <div className="border border-primary/30 rounded-lg p-3 bg-white">
                              <h5 className="font-extrabold text-primary mb-2">Morning Shift</h5>
                              <div className="space-y-1">
                                <div>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(att.morningShift?.status || 'absent')}`}>
                                    {att.morningShift?.status || 'absent'}
                                  </span>
                                </div>
                                {att.morningShift?.checkIn && (
                                  <div className="text-sm text-primary">
                                    <span className="font-semibold">Check In:</span> {att.morningShift.checkIn}
                                  </div>
                                )}
                                {att.morningShift?.checkOut && (
                                  <div className="text-sm text-primary">
                                    <span className="font-semibold">Check Out:</span> {att.morningShift.checkOut}
                                  </div>
                                )}
                                {att.morningShift?.notes && (
                                  <div className="text-sm text-primary/70 mt-2">
                                    <span className="font-semibold">Notes:</span> {att.morningShift.notes}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Evening Shift */}
                            <div className="border border-primary/30 rounded-lg p-3 bg-white">
                              <h5 className="font-extrabold text-primary mb-2">Evening Shift</h5>
                              <div className="space-y-1">
                                <div>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(att.eveningShift?.status || 'absent')}`}>
                                    {att.eveningShift?.status || 'absent'}
                                  </span>
                                </div>
                                {att.eveningShift?.checkIn && (
                                  <div className="text-sm text-primary">
                                    <span className="font-semibold">Check In:</span> {att.eveningShift.checkIn}
                                  </div>
                                )}
                                {att.eveningShift?.checkOut && (
                                  <div className="text-sm text-primary">
                                    <span className="font-semibold">Check Out:</span> {att.eveningShift.checkOut}
                                  </div>
                                )}
                                {att.eveningShift?.notes && (
                                  <div className="text-sm text-primary/70 mt-2">
                                    <span className="font-semibold">Notes:</span> {att.eveningShift.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-primary/30 rounded-lg p-3 bg-white">
                            <h5 className="font-extrabold text-primary mb-2">Shift: {att.shift?.name || 'Default'}</h5>
                            <div className="space-y-1">
                              <div>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(att.shift?.status || 'absent')}`}>
                                  {att.shift?.status || 'absent'}
                                </span>
                              </div>
                              {att.shift?.checkIn && (
                                <div className="text-sm text-primary">
                                  <span className="font-semibold">Check In:</span> {att.shift.checkIn}
                                </div>
                              )}
                              {att.shift?.checkOut && (
                                <div className="text-sm text-primary">
                                  <span className="font-semibold">Check Out:</span> {att.shift.checkOut}
                                </div>
                              )}
                              {att.shift?.notes && (
                                <div className="text-sm text-primary/70 mt-2">
                                  <span className="font-semibold">Notes:</span> {att.shift.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        {onClose && (
          <div className="flex justify-end space-x-3 p-6 border-t-2 border-primary">
            <button
              onClick={onClose}
              className="px-6 py-2 border-2 border-primary rounded-lg hover:bg-primary/10 font-extrabold text-primary shadow-lg"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAttendanceView;

