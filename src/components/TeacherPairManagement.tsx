import React, { useState, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import Card from './Card';

interface TeacherPairManagementProps {
  onClose: () => void;
}

const TeacherPairManagement: React.FC<TeacherPairManagementProps> = ({ onClose }) => {
  const { 
    getTeacherPairs, 
    createTeacherPair, 
    updateTeacherPair, 
    deleteTeacherPair,
    getPairStudents,
    createPairStudent,
<<<<<<< HEAD
=======
    updatePairStudent,
>>>>>>> 1fccc8be17075747304c5af1dcd2c13a732cbf5c
    deletePairStudent,
    teachers,
    students
  } = useBackendData();

  const [pairs, setPairs] = useState<any[]>([]);
  const [pairStudents, setPairStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPair, setEditingPair] = useState<any>(null);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingPairStudent, setEditingPairStudent] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    teacher1: '',
    teacher2: '',
    program: 'Full-Time HQ' as 'Full-Time HQ' | 'Part-Time HQ' | 'After School',
    status: 'active' as 'active' | 'inactive',
    notes: ''
  });

  const [studentFormData, setStudentFormData] = useState({
    student: '',
    program: '' as string,
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    days: [] as string[],
    status: 'active' as 'active' | 'on-hold' | 'completed'
  });

  useEffect(() => {
    loadPairs();
  }, []);

  useEffect(() => {
    if (selectedPair) {
      loadPairStudents(selectedPair);
    }
  }, [selectedPair]);

  const loadPairs = async () => {
    setLoading(true);
    try {
      const data = await getTeacherPairs();
      setPairs(data);
    } catch (error) {
      console.error('Error loading pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPairStudents = async (pairId: string) => {
    try {
      const data = await getPairStudents({ pair: pairId });
      // Sort by program then A-Z by name
      const sorted = [...data].sort((a, b) => {
        const programA = (a.student?.program || a.pair?.program || '').toLowerCase();
        const programB = (b.student?.program || b.pair?.program || '').toLowerCase();
        if (programA !== programB) {
          return programA.localeCompare(programB);
        }
        const nameA = (a.student?.fullName || '').toLowerCase();
        const nameB = (b.student?.fullName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setPairStudents(sorted);
    } catch (error) {
      console.error('Error loading pair students:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingPair) {
        await updateTeacherPair(editingPair._id, formData);
      } else {
        await createTeacherPair(formData);
      }
      await loadPairs();
      setShowForm(false);
      setEditingPair(null);
      setFormData({
        name: '',
        teacher1: '',
        teacher2: '',
        program: 'Full-Time HQ',
        status: 'active',
        notes: ''
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save pair');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Check if pair has students
    const pairStudents = await getPairStudents({ pair: id });
    if (pairStudents.length > 0) {
      const confirmDelete = confirm(
        `This pair has ${pairStudents.length} student(s) assigned. ` +
        `You need to remove all students before deleting the pair. ` +
        `Would you like to remove all students and delete the pair?`
      );
      
      if (!confirmDelete) return;
      
      // Delete all students first
      try {
        for (const pairStudent of pairStudents) {
          await deletePairStudent(pairStudent._id);
        }
      } catch (error) {
        alert('Failed to remove students. Please remove them manually first.');
        return;
      }
    } else {
      if (!confirm('Are you sure you want to delete this teacher pair?')) return;
    }
    
    try {
      await deleteTeacherPair(id);
      await loadPairs();
      if (selectedPair === id) {
        setSelectedPair(null);
        setPairStudents([]);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete pair');
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPair) return;
    
    setLoading(true);
    try {
      if (editingPairStudent) {
        // Update existing pair student
        await updatePairStudent(editingPairStudent._id, {
          ...studentFormData,
          pair: selectedPair
        });
        setEditingPairStudent(null);
      } else {
        // Create new pair student
        await createPairStudent({
          ...studentFormData,
          pair: selectedPair
        });
      }
      await loadPairStudents(selectedPair);
      setShowStudentForm(false);
      setStudentFormData({
        student: '',
        program: '',
        startDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        days: [],
        status: 'active'
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save student to pair');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPairStudent = (pairStudent: any) => {
    setEditingPairStudent(pairStudent);
    setStudentFormData({
      student: pairStudent.student?._id || pairStudent.student || '',
      program: pairStudent.student?.program || pairStudent.pair?.program || '',
      startDate: pairStudent.startDate || new Date().toISOString().split('T')[0],
      startTime: pairStudent.startTime || '09:00',
      endTime: pairStudent.endTime || '10:00',
      days: pairStudent.days || [],
      status: pairStudent.status || 'active'
    });
    setShowStudentForm(true);
  };

  const handleDeletePairStudent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this student from the pair?')) return;
    if (!selectedPair) return;
    
    setLoading(true);
    try {
      await deletePairStudent(id);
      await loadPairStudents(selectedPair);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove student from pair');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setStudentFormData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const daysOfWeek = [
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
    { value: 'sat', label: 'Saturday' },
    { value: 'sun', label: 'Sunday' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-primary px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-primary">Teacher Pair Management</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add/Edit Pair Form */}
          {showForm && (
            <Card title={editingPair ? 'Edit Teacher Pair' : 'Create Teacher Pair'}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pair Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Teacher 1</label>
                    <select
                      value={formData.teacher1}
                      onChange={(e) => setFormData({ ...formData, teacher1: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary"
                      required
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(teacher => {
                        // Use Teacher document _id (not User.id)
                        const teacherDocId = (teacher as any)._id || (teacher as any).teacherDocumentId || teacher.id;
                        return (
                          <option key={teacher.id} value={teacherDocId}>
                            {teacher.fullName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Teacher 2</label>
                    <select
                      value={formData.teacher2}
                      onChange={(e) => setFormData({ ...formData, teacher2: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary"
                      required
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(teacher => {
                        // Use Teacher document _id (not User.id)
                        const teacherDocId = (teacher as any)._id || (teacher as any).teacherDocumentId || teacher.id;
                        return (
                          <option key={teacher.id} value={teacherDocId}>
                            {teacher.fullName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Program</label>
                  <select
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value as any })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary"
                    required
                  >
                    <option value="Full-Time HQ">Full-Time HQ</option>
                    <option value="Part-Time HQ">Part-Time HQ</option>
                    <option value="After School">After School</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingPair ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingPair(null);
                      setFormData({
                        name: '',
                        teacher1: '',
                        teacher2: '',
                        program: 'Full-Time HQ',
                        status: 'active',
                        notes: ''
                      });
                    }}
                    className="px-6 py-2 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* Pairs List */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-primary">Teacher Pairs</h3>
            <button
              onClick={() => {
                setEditingPair(null);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90"
            >
              + Create Pair
            </button>
          </div>

          {loading && pairs.length === 0 ? (
            <div className="text-center py-8">Loading...</div>
          ) : pairs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No teacher pairs found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pairs.map(pair => (
                <div key={pair._id} className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-lg text-primary">{pair.name}</h4>
                      <p className="text-sm text-gray-600">{pair.program}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {pair.teacher1?.fullName || 'Teacher 1'} & {pair.teacher2?.fullName || 'Teacher 2'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      pair.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pair.status}
                    </span>
                  </div>

                  {pair.notes && (
                    <p className="text-sm text-gray-600 mb-3">{pair.notes}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedPair(selectedPair === pair._id ? null : pair._id);
                        setShowStudentForm(false);
                      }}
                      className="px-3 py-1 bg-primary text-white rounded text-sm font-bold hover:bg-primary/90"
                    >
                      {selectedPair === pair._id ? 'Hide' : 'View'} Students
                    </button>
                    <button
                      onClick={() => {
                        setEditingPair(pair);
                        setFormData({
                          name: pair.name,
                          teacher1: pair.teacher1?._id || pair.teacher1,
                          teacher2: pair.teacher2?._id || pair.teacher2,
                          program: pair.program,
                          status: pair.status,
                          notes: pair.notes || ''
                        });
                        setShowForm(true);
                      }}
                      className="px-3 py-1 border-2 border-primary text-primary rounded text-sm font-bold hover:bg-soft-primary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(pair._id)}
                      className="px-3 py-1 border-2 border-red-500 text-red-500 rounded text-sm font-bold hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Pair Students */}
                  {selectedPair === pair._id && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-bold text-primary">Students in Pair</h5>
                        <button
                          onClick={() => {
                            setEditingPairStudent(null);
                            setStudentFormData({
                              student: '',
                              program: '',
                              startDate: new Date().toISOString().split('T')[0],
                              startTime: '09:00',
                              endTime: '10:00',
                              days: [],
                              status: 'active'
                            });
                            setShowStudentForm(true);
                          }}
                          className="px-2 py-1 bg-accent text-white rounded text-xs font-bold hover:bg-accent/90"
                        >
                          + Add Student
                        </button>
                      </div>

                      {showStudentForm && (
                        <form onSubmit={handleAddStudent} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                          <div className="flex justify-between items-center mb-2">
                            <h6 className="text-sm font-bold text-primary">
                              {editingPairStudent ? 'Edit Student in Pair' : 'Add Student to Pair'}
                            </h6>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Program</label>
                            <select
                              value={studentFormData.program}
                              onChange={(e) => {
                                if (!editingPairStudent) {
                                  setStudentFormData({ ...studentFormData, program: e.target.value, student: '' });
                                }
                              }}
                              className="w-full px-3 py-1 border-2 border-gray-200 rounded text-sm"
                              required
                              disabled={!!editingPairStudent}
                            >
                              <option value="">Select Program</option>
                              <option value="Full-Time HQ">Full-Time HQ</option>
                              <option value="Part-Time HQ">Part-Time HQ</option>
                              <option value="After School">After School</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Student</label>
                            <select
                              value={studentFormData.student}
                              onChange={(e) => setStudentFormData({ ...studentFormData, student: e.target.value })}
                              className="w-full px-3 py-1 border-2 border-gray-200 rounded text-sm"
                              required
                              disabled={!studentFormData.program || !!editingPairStudent}
                            >
                              <option value="">{studentFormData.program ? 'Select Student' : 'Select Program First'}</option>
                              {(() => {
                                if (!studentFormData.program) {
                                  return null;
                                }
                                
                                // Normalize program names for comparison (handle hyphens, spaces, case)
                                const normalizeProgram = (program: string) => {
                                  return program
                                    .trim()
                                    .toLowerCase()
                                    .replace(/-/g, ' ')  // Replace hyphens with spaces
                                    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
                                    .trim();
                                };
                                
                                const selectedProgram = normalizeProgram(studentFormData.program);
                                const filtered = [...students].filter(student => {
                                  const studentProgram = normalizeProgram(student.program || '');
                                  return studentProgram === selectedProgram;
                                });
                                
                                if (filtered.length === 0) {
                                  return (
                                    <option value="" disabled>
                                      No students found for {studentFormData.program}
                                    </option>
                                  );
                                }
                                
                                return filtered
                                  .sort((a, b) => {
                                    const nameA = (a.fullName || '').toLowerCase();
                                    const nameB = (b.fullName || '').toLowerCase();
                                    return nameA.localeCompare(nameB);
                                  })
                                  .map(student => (
                                    <option key={student.id} value={student.id}>
                                      {student.fullName}
                                    </option>
                                  ));
                              })()}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                              <input
                                type="time"
                                value={studentFormData.startTime}
                                onChange={(e) => setStudentFormData({ ...studentFormData, startTime: e.target.value })}
                                className="w-full px-3 py-1 border-2 border-gray-200 rounded text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                              <input
                                type="time"
                                value={studentFormData.endTime}
                                onChange={(e) => setStudentFormData({ ...studentFormData, endTime: e.target.value })}
                                className="w-full px-3 py-1 border-2 border-gray-200 rounded text-sm"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Days</label>
                            <div className="flex flex-wrap gap-2">
                              {daysOfWeek.map(day => (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => toggleDay(day.value)}
                                  className={`px-2 py-1 rounded text-xs font-bold ${
                                    studentFormData.days.includes(day.value)
                                      ? 'bg-primary text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {day.label.slice(0, 3)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={loading || studentFormData.days.length === 0}
                              className="px-3 py-1 bg-primary text-white rounded text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
                            >
                              {editingPairStudent ? 'Update' : 'Add'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowStudentForm(false);
                                setEditingPairStudent(null);
                                setStudentFormData({
                                  student: '',
                                  program: '',
                                  startDate: new Date().toISOString().split('T')[0],
                                  startTime: '09:00',
                                  endTime: '10:00',
                                  days: [],
                                  status: 'active'
                                });
                              }}
                              className="px-3 py-1 border-2 border-gray-300 rounded text-xs font-bold hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {pairStudents.length === 0 ? (
                        <p className="text-sm text-gray-500">No students assigned to this pair</p>
                      ) : (
                        <div className="space-y-2">
                          {pairStudents.map(ps => (
<<<<<<< HEAD
                            <div key={ps._id} className="p-2 bg-gray-50 rounded text-sm flex justify-between items-start">
                              <div>
                                <div className="font-semibold">{ps.student?.fullName || 'Unknown'}</div>
                                <div className="text-xs text-gray-600">
                                  {ps.startTime} - {ps.endTime} • {ps.days.join(', ')}
                                </div>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                                  ps.status === 'active' ? 'bg-green-100 text-green-800' :
                                  ps.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {ps.status}
                                </span>
                              </div>
                              <button
                                onClick={async () => {
                                  if (!confirm(`Remove ${ps.student?.fullName || 'this student'} from this pair?`)) return;
                                  try {
                                    await deletePairStudent(ps._id);
                                    await loadPairStudents(selectedPair!);
                                  } catch (error) {
                                    alert(error instanceof Error ? error.message : 'Failed to remove student');
                                  }
                                }}
                                className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 font-bold"
                                title="Remove student from pair"
                              >
                                ×
                              </button>
=======
                            <div key={ps._id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-primary">{ps.student?.fullName || 'Unknown'}</div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {ps.startTime} - {ps.endTime} • {ps.days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                                  </div>
                                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-semibold ${
                                    ps.status === 'active' ? 'bg-green-100 text-green-800' :
                                    ps.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {ps.status}
                                  </span>
                                </div>
                                <div className="flex gap-2 ml-3">
                                  <button
                                    onClick={() => handleEditPairStudent(ps)}
                                    disabled={loading}
                                    className="px-2 py-1 bg-primary text-white rounded text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition"
                                    title="Edit student in pair"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeletePairStudent(ps._id)}
                                    disabled={loading}
                                    className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition"
                                    title="Remove student from pair"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </div>
>>>>>>> 1fccc8be17075747304c5af1dcd2c13a732cbf5c
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherPairManagement;

