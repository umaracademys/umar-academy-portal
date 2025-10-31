import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import Header from '../components/Header';
import Card from '../components/Card';
import DebugPanel from '../components/DebugPanel';

const PROGRAMS = ['Full-Time HQ', 'Part-Time HQ', 'After School Reading'];

interface AssignmentForm {
  sabq: string;
  sabqi: string;
  manzil: string;
  homework: string;
  comment: string;
}

const AssignmentsBulk: React.FC = () => {
  const { students } = useData();
  
  // State
  const [program, setProgram] = useState(PROGRAMS[0]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'cards' | 'sheet'>('cards');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  
  // Forms state for each student
  const [forms, setForms] = useState<Record<string, AssignmentForm>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Filter students
  const filtered = useMemo(() => {
    let list = students.filter(s => s.program === program);
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.fullName.toLowerCase().includes(q) ||
        s.parentName?.toLowerCase().includes(q)
      );
    }
    
    if (showPendingOnly) {
      list = list.filter(s => !completed.has(s.id));
    }
    
    return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, program, search, showPendingOnly, completed]);

  const updateField = (studentId: string, field: keyof AssignmentForm, value: string) => {
    setForms(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const saveAssignment = async (studentId: string) => {
    setSaving(prev => ({ ...prev, [studentId]: true }));
    
    // Simulate save (in real app, this would call an API)
    setTimeout(() => {
      setCompleted(prev => new Set(prev).add(studentId));
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }, 500);
  };

  const editAssignment = (studentId: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
  };

  const saveAll = () => {
    filtered.forEach(student => {
      if (!completed.has(student.id) && forms[student.id]) {
        saveAssignment(student.id);
      }
    });
  };

  const progressPct = filtered.length === 0 ? 0 : Math.round((filtered.filter(s => completed.has(s.id)).length / filtered.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Professional Header */}
        <div className="rounded-xl shadow-lg p-6 mb-6" style={{ background: 'linear-gradient(135deg, #2E4D32 0%, #1d2e1f 100%)' }}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Assignment Management</h1>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: '#E7AA39' }}>
                  {program}
                </span>
                <span className="text-white text-sm">{selectedDate}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className="text-white text-sm font-semibold">Progress: {progressPct}%</span>
              </div>
              <div className="w-48 h-3 bg-white bg-opacity-20 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300" 
                  style={{ width: `${progressPct}%`, backgroundColor: '#E7AA39' }}
                />
              </div>
              <div className="text-white text-xs mt-1">
                {filtered.filter(s => completed.has(s.id)).length}/{filtered.length} completed
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Program</label>
              <select
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-transparent focus:ring-2 focus:ring-green-600 transition"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              >
                {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-transparent focus:ring-2 transition"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <input
                type="text"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-transparent focus:ring-2 transition"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                className="flex-1 px-4 py-2 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#2E4D32' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#253d28'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E4D32'}
                onClick={saveAll}
              >
                Save All
              </button>
            </div>
          </div>

          {/* View Toggle & Filters */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'cards' ? 'text-white' : 'bg-gray-100 text-gray-700'
                }`}
                style={view === 'cards' ? { backgroundColor: '#2E4D32' } : {}}
                onClick={() => setView('cards')}
              >
                Card View
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'sheet' ? 'text-white' : 'bg-gray-100 text-gray-700'
                }`}
                style={view === 'sheet' ? { backgroundColor: '#2E4D32' } : {}}
                onClick={() => setView('sheet')}
              >
                Sheet View
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPendingOnly}
                onChange={(e) => setShowPendingOnly(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Pending Only</span>
            </label>
          </div>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4" style={{ borderLeftColor: '#2E4D32' }}>
            <div className="text-sm font-semibold text-gray-600 uppercase">Total Students</div>
            <div className="text-3xl font-bold mt-1" style={{ color: '#2E4D32' }}>{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4" style={{ borderLeftColor: '#E7AA39' }}>
            <div className="text-sm font-semibold text-gray-600 uppercase">Completed</div>
            <div className="text-3xl font-bold mt-1" style={{ color: '#E7AA39' }}>
              {filtered.filter(s => completed.has(s.id)).length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-500">
            <div className="text-sm font-semibold text-gray-600 uppercase">Pending</div>
            <div className="text-3xl font-bold text-red-600 mt-1">
              {filtered.filter(s => !completed.has(s.id)).length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4" style={{ borderLeftColor: '#2E4D32' }}>
            <div className="text-sm font-semibold text-gray-600 uppercase">Progress</div>
            <div className="text-3xl font-bold mt-1" style={{ color: '#2E4D32' }}>{progressPct}%</div>
          </div>
        </div>

        {/* Card View */}
        {view === 'cards' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((student, index) => {
              const form = forms[student.id] || { sabq: '', sabqi: '', manzil: '', homework: '', comment: '' };
              const isCompleted = completed.has(student.id);
              const hasContent = form.sabq || form.sabqi || form.manzil || form.homework || form.comment;

              return (
                <div
                  key={student.id}
                  className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 border-2 ${
                    isCompleted ? 'border-l-4' : 'border-l-4'
                  }`}
                  style={{ 
                    borderLeftColor: isCompleted ? '#2E4D32' : hasContent ? '#E7AA39' : '#e5e7eb',
                    backgroundColor: isCompleted ? '#f0fdf4' : hasContent ? '#fffbeb' : 'white'
                  }}
                >
                  {/* Student Header */}
                  <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: '#2E4D32' }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{student.fullName}</h3>
                        <p className="text-sm text-gray-600">{student.parentName}</p>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="px-3 py-1 text-xs font-semibold text-white rounded-full" style={{ backgroundColor: '#2E4D32' }}>
                        Completed
                      </span>
                    )}
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Sabq</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 transition"
                          value={form.sabq}
                          onChange={(e) => updateField(student.id, 'sabq', e.target.value)}
                          disabled={isCompleted}
                          placeholder="Sabq..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Sabqi</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 transition"
                          value={form.sabqi}
                          onChange={(e) => updateField(student.id, 'sabqi', e.target.value)}
                          disabled={isCompleted}
                          placeholder="Sabqi..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Manzil</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 transition"
                          value={form.manzil}
                          onChange={(e) => updateField(student.id, 'manzil', e.target.value)}
                          disabled={isCompleted}
                          placeholder="Manzil..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Homework</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 transition resize-none"
                        rows={2}
                        value={form.homework}
                        onChange={(e) => updateField(student.id, 'homework', e.target.value)}
                        disabled={isCompleted}
                        placeholder="Homework details..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Teacher Comment</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 transition resize-none"
                        rows={2}
                        value={form.comment}
                        onChange={(e) => updateField(student.id, 'comment', e.target.value)}
                        disabled={isCompleted}
                        placeholder="Comments..."
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    {isCompleted ? (
                      <button
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                        onClick={() => editAssignment(student.id)}
                      >
                        Edit
                      </button>
                    ) : (
                      <button
                        className="flex-1 px-4 py-2 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                        style={{ backgroundColor: '#2E4D32' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#253d28'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E4D32'}
                        onClick={() => saveAssignment(student.id)}
                        disabled={saving[student.id]}
                      >
                        {saving[student.id] ? 'Saving...' : 'Save Assignment'}
                      </button>
                    )}
                    <button
                      className="px-4 py-2 rounded-lg font-semibold transition-all"
                      style={{ backgroundColor: '#E7AA39', color: 'white' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d99a2f'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E7AA39'}
                    >
                      Email Parent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sheet View */}
        {view === 'sheet' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Sabq</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Sabqi</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Manzil</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Homework</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Comment</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student, index) => {
                    const form = forms[student.id] || { sabq: '', sabqi: '', manzil: '', homework: '', comment: '' };
                    const isCompleted = completed.has(student.id);
                    const hasContent = !!(form.sabq || form.sabqi || form.manzil || form.homework || form.comment);

                    return (
                      <tr 
                        key={student.id} 
                        className={`border-b border-gray-100 hover:bg-gray-50 ${isCompleted ? 'bg-green-50' : ''}`}
                      >
                        <td className="px-4 py-3 font-semibold" style={{ color: '#2E4D32' }}>{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{student.fullName}</div>
                          <div className="text-xs text-gray-600">{student.parentName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1"
                            value={form.sabq}
                            onChange={(e) => updateField(student.id, 'sabq', e.target.value)}
                            disabled={isCompleted}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1"
                            value={form.sabqi}
                            onChange={(e) => updateField(student.id, 'sabqi', e.target.value)}
                            disabled={isCompleted}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1"
                            value={form.manzil}
                            onChange={(e) => updateField(student.id, 'manzil', e.target.value)}
                            disabled={isCompleted}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 resize-none"
                            rows={1}
                            value={form.homework}
                            onChange={(e) => updateField(student.id, 'homework', e.target.value)}
                            disabled={isCompleted}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 resize-none"
                            rows={1}
                            value={form.comment}
                            onChange={(e) => updateField(student.id, 'comment', e.target.value)}
                            disabled={isCompleted}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {isCompleted ? (
                              <button
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold hover:bg-gray-200"
                                onClick={() => editAssignment(student.id)}
                              >
                                Edit
                              </button>
                            ) : (
                              <button
                                className="px-3 py-1 text-white rounded text-xs font-semibold"
                                style={{ backgroundColor: '#2E4D32' }}
                                onClick={() => saveAssignment(student.id)}
                                disabled={saving[student.id]}
                              >
                                {saving[student.id] ? 'Saving...' : 'Save'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isCompleted ? (
                            <span className="px-2 py-1 text-xs font-semibold text-white rounded-full" style={{ backgroundColor: '#2E4D32' }}>
                              Done
                            </span>
                          ) : hasContent ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                              Unsaved
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">
                              Empty
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No students found</p>
            </div>
          </Card>
        )}
      </div>
      
      <DebugPanel />
    </div>
  );
};

export default AssignmentsBulk;

