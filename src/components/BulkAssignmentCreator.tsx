import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Program } from '../types/assignment';

interface AssignmentRow {
  id: string;
  title: string;
  description: string;
  type: 'classwork' | 'homework';
  classworkType?: 'sabq' | 'sabqi' | 'manzil';
  program: string;
  assignedTo: string[];
  dueDate: string;
  attachments: { type: 'text' | 'link'; content: string; title?: string }[];
  // Special fields for "After School Reading" program
  assignedTeacher?: string;
  readingLink?: string;
  comments?: string;
}

interface BulkAssignmentCreatorProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BulkAssignmentCreator: React.FC<BulkAssignmentCreatorProps> = ({ onClose, onSuccess }) => {
  const { students, teachers, addAssignment } = useData();
  const { user } = useAuth();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([
    {
      id: '1',
      title: '',
      description: '',
      type: 'classwork',
      classworkType: 'sabq',
      program: '',
      assignedTo: [],
      dueDate: '',
      attachments: []
    }
  ]);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock programs - in real app, this would come from API
  useEffect(() => {
    const mockPrograms: Program[] = [
      { id: '1', name: 'Full Time HQ', description: 'Full-time Hifz program', students: ['1', '2', '3'], createdAt: new Date(), status: 'active' },
      { id: '2', name: 'Part Time HQ', description: 'Part-time Hifz program', students: ['1', '4', '5'], createdAt: new Date(), status: 'active' },
      { id: '3', name: 'After School Reading', description: 'After school reading program', students: ['2', '3', '6'], createdAt: new Date(), status: 'active' }
    ];
    setPrograms(mockPrograms);
  }, []);

  const addRow = () => {
    const newRow: AssignmentRow = {
      id: Date.now().toString(),
      title: '',
      description: '',
      type: 'classwork',
      classworkType: 'sabq',
      program: selectedProgram,
      assignedTo: selectedStudents,
      dueDate: '',
      attachments: []
    };
    setAssignments(prev => [...prev, newRow]);
  };

  const removeRow = (id: string) => {
    if (assignments.length > 1) {
      setAssignments(prev => prev.filter(row => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof AssignmentRow, value: any) => {
    setAssignments(prev => 
      prev.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const applyToAll = (field: keyof AssignmentRow, value: any) => {
    setAssignments(prev => 
      prev.map(row => ({ ...row, [field]: value }))
    );
  };

  const validateAssignments = () => {
    const newErrors: Record<string, string> = {};
    
    assignments.forEach((assignment, index) => {
      const rowPrefix = `row_${index}`;
      
      if (!assignment.title.trim()) {
        newErrors[`${rowPrefix}_title`] = 'Title is required';
      }
      if (!assignment.description.trim()) {
        newErrors[`${rowPrefix}_description`] = 'Description is required';
      }
      if (!assignment.program) {
        newErrors[`${rowPrefix}_program`] = 'Program is required';
      }
      if (assignment.assignedTo.length === 0) {
        newErrors[`${rowPrefix}_students`] = 'At least one student must be selected';
      }
      if (!assignment.dueDate) {
        newErrors[`${rowPrefix}_dueDate`] = 'Due date is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAssignments()) {
      return;
    }

    setLoading(true);
    try {
      const assignmentPromises = assignments.map(assignment => 
        addAssignment({
          ...assignment,
          assignedBy: user?.id || '',
          dueDate: new Date(assignment.dueDate),
          createdAt: new Date(),
          status: 'published',
          submissions: [],
          notifications: []
        })
      );

      await Promise.all(assignmentPromises);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStudents = (programId: string) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return [];
    return students.filter(s => program.students.includes(s.id));
  };

  const getError = (rowIndex: number, field: string) => {
    return errors[`row_${rowIndex}_${field}`];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Bulk Assignment Creator</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Global Settings */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Global Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Default Program
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => {
                    setSelectedProgram(e.target.value);
                    applyToAll('program', e.target.value);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Program</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Default Students
                </label>
                <select
                  multiple
                  value={selectedStudents}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                    setSelectedStudents(values);
                    applyToAll('assignedTo', values);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={3}
                >
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.fullName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addRow}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
                >
                  Add Row
                </button>
              </div>
            </div>
          </div>

          {/* Spreadsheet-style Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Classwork Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Students *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teacher
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reading Link
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comments
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map((assignment, index) => (
                    <tr key={assignment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {/* Title */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={assignment.title}
                          onChange={(e) => updateRow(assignment.id, 'title', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            getError(index, 'title') ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Assignment title"
                        />
                        {getError(index, 'title') && (
                          <p className="text-red-500 text-xs mt-1">{getError(index, 'title')}</p>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3">
                        <textarea
                          value={assignment.description}
                          onChange={(e) => updateRow(assignment.id, 'description', e.target.value)}
                          rows={2}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            getError(index, 'description') ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Assignment description"
                        />
                        {getError(index, 'description') && (
                          <p className="text-red-500 text-xs mt-1">{getError(index, 'description')}</p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <select
                          value={assignment.type}
                          onChange={(e) => updateRow(assignment.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="classwork">Classwork</option>
                          <option value="homework">Homework</option>
                        </select>
                      </td>

                      {/* Classwork Type */}
                      <td className="px-4 py-3">
                        {assignment.type === 'classwork' ? (
                          <select
                            value={assignment.classworkType || 'sabq'}
                            onChange={(e) => updateRow(assignment.id, 'classworkType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="sabq">Sabq</option>
                            <option value="sabqi">Sabqi</option>
                            <option value="manzil">Manzil</option>
                          </select>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>

                      {/* Program */}
                      <td className="px-4 py-3">
                        <select
                          value={assignment.program}
                          onChange={(e) => updateRow(assignment.id, 'program', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            getError(index, 'program') ? 'border-red-300' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Program</option>
                          {programs.map(program => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                            </option>
                          ))}
                        </select>
                        {getError(index, 'program') && (
                          <p className="text-red-500 text-xs mt-1">{getError(index, 'program')}</p>
                        )}
                      </td>

                      {/* Students */}
                      <td className="px-4 py-3">
                        <select
                          multiple
                          value={assignment.assignedTo}
                          onChange={(e) => {
                            const values = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                            updateRow(assignment.id, 'assignedTo', values);
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            getError(index, 'students') ? 'border-red-300' : 'border-gray-300'
                          }`}
                          size={2}
                        >
                          {getAvailableStudents(assignment.program).map(student => (
                            <option key={student.id} value={student.id}>
                              {student.fullName}
                            </option>
                          ))}
                        </select>
                        {getError(index, 'students') && (
                          <p className="text-red-500 text-xs mt-1">{getError(index, 'students')}</p>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={assignment.dueDate}
                          onChange={(e) => updateRow(assignment.id, 'dueDate', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            getError(index, 'dueDate') ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {getError(index, 'dueDate') && (
                          <p className="text-red-500 text-xs mt-1">{getError(index, 'dueDate')}</p>
                        )}
                      </td>

                      {/* Assigned Teacher */}
                      <td className="px-4 py-3">
                        {assignment.program === '3' ? ( // After School Reading
                          <select
                            value={assignment.assignedTeacher || ''}
                            onChange={(e) => updateRow(assignment.id, 'assignedTeacher', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Teacher</option>
                            {teachers.map(teacher => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.fullName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>

                      {/* Reading Link */}
                      <td className="px-4 py-3">
                        {assignment.program === '3' ? ( // After School Reading
                          <input
                            type="url"
                            value={assignment.readingLink || ''}
                            onChange={(e) => updateRow(assignment.id, 'readingLink', e.target.value)}
                            placeholder="Paste reading link here"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>

                      {/* Comments */}
                      <td className="px-4 py-3">
                        {assignment.program === '3' ? ( // After School Reading
                          <textarea
                            value={assignment.comments || ''}
                            onChange={(e) => updateRow(assignment.id, 'comments', e.target.value)}
                            placeholder="Add comments..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeRow(assignment.id)}
                          disabled={assignments.length === 1}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700">Total Assignments:</span>
                <span className="ml-2 text-blue-600">{assignments.length}</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Classwork:</span>
                <span className="ml-2 text-blue-600">
                  {assignments.filter(a => a.type === 'classwork').length}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Homework:</span>
                <span className="ml-2 text-blue-600">
                  {assignments.filter(a => a.type === 'homework').length}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Total Students:</span>
                <span className="ml-2 text-blue-600">
                  {new Set(assignments.flatMap(a => a.assignedTo)).size}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : `Create ${assignments.length} Assignments`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkAssignmentCreator;
