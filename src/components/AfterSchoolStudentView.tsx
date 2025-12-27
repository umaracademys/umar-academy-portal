import React, { useState, useEffect, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { InteractiveMushaf } from '@umar-academy/mushaf';
import { MushafMistake } from '@umar-academy/mushaf';
import Card from './Card';

interface AfterSchoolStudentViewProps {
  studentId: string;
  onClose: () => void;
}

const AfterSchoolStudentView: React.FC<AfterSchoolStudentViewProps> = ({ studentId, onClose }) => {
  const { students, teachers } = useData();
  const { getStudentPersonalMushaf, assignments } = useBackendData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'assignments' | 'mushaf'>('assignments');
  const [mushafMistakes, setMushafMistakes] = useState<MushafMistake[]>([]);
  const [mushafPage, setMushafPage] = useState(1);
  const [loadingMushaf, setLoadingMushaf] = useState(false);

  const student = useMemo(() => {
    return students.find(s => s.id === studentId || (s as any)._id?.toString() === studentId);
  }, [students, studentId]);

  // Load Mushaf mistakes
  useEffect(() => {
    const loadMushaf = async () => {
      if (activeTab === 'mushaf' && studentId) {
        setLoadingMushaf(true);
        try {
          const data = await getStudentPersonalMushaf(studentId);
          if (data && data.mistakes) {
            const convertedMistakes: MushafMistake[] = data.mistakes.map((m: any) => ({
              id: m.id,
              type: m.type,
              page: m.page,
              surah: m.surah,
              ayah: m.ayah,
              wordIndex: m.wordIndex,
              letterIndex: m.letterIndex,
              position: m.position,
              note: m.note,
              audioUrl: m.audioUrl,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            }));
            setMushafMistakes(convertedMistakes);
            if (convertedMistakes.length > 0) {
              setMushafPage(convertedMistakes[0].page);
            }
          }
        } catch (error) {
          console.error('Error loading Mushaf:', error);
        } finally {
          setLoadingMushaf(false);
        }
      }
    };
    loadMushaf();
  }, [activeTab, studentId, getStudentPersonalMushaf]);


  // Get student assignments - filter properly
  const studentAssignments = useMemo(() => {
    if (!studentId) return [];
    return assignments.filter((a: any) => {
      const assignmentStudentId = a.studentId || (a as any)._id?.studentId;
      return assignmentStudentId === studentId || 
             assignmentStudentId === studentId.toString() ||
             String(assignmentStudentId) === String(studentId);
    }).sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [assignments, studentId]);


  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">After School Student Review</h2>
            <p className="text-sm text-gray-600 mt-1">
              {student?.fullName || 'Student'} - Review assignments, Mushaf, and evaluations
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'assignments'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Assignments ({studentAssignments.length})
            </button>
            <button
              onClick={() => setActiveTab('mushaf')}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'mushaf'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mushaf ({mushafMistakes.length} mistakes)
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'assignments' && (
            <div>
              {studentAssignments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">No assignments yet</p>
                  <p className="text-sm text-gray-500 mt-1">This student has no assignments prepared yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentAssignments.map((assignment: any) => {
                    const assignmentId = assignment._id || assignment.id;
                    const createdAt = assignment.createdAt ? new Date(assignment.createdAt) : new Date();
                    const classwork = assignment.classwork || { sabq: [], sabqi: [], manzil: [] };
                    const hasClasswork = classwork.sabq.length > 0 || classwork.sabqi.length > 0 || classwork.manzil.length > 0;
                    const hasHomework = assignment.homework?.enabled;
                    
                    return (
                      <Card key={assignmentId} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {assignment.comment || 'Assignment'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Assigned by {assignment.assignedByName || 'Teacher'} on {formatDate(createdAt)}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            assignment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {assignment.status || 'active'}
                          </span>
                        </div>

                        {/* Classwork */}
                        {hasClasswork && (
                          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Classwork</h4>
                            <div className="space-y-3">
                              {classwork.sabq.length > 0 && (
                                <div>
                                  <span className="text-xs font-semibold text-blue-700 uppercase">Sabq:</span>
                                  <ul className="mt-1 space-y-1">
                                    {classwork.sabq.map((phase: any, idx: number) => (
                                      <li key={idx} className="text-sm text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Sabq recitation'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {classwork.sabqi.length > 0 && (
                                <div>
                                  <span className="text-xs font-semibold text-green-700 uppercase">Sabqi:</span>
                                  <ul className="mt-1 space-y-1">
                                    {classwork.sabqi.map((phase: any, idx: number) => (
                                      <li key={idx} className="text-sm text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Sabqi recitation'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {classwork.manzil.length > 0 && (
                                <div>
                                  <span className="text-xs font-semibold text-purple-700 uppercase">Manzil:</span>
                                  <ul className="mt-1 space-y-1">
                                    {classwork.manzil.map((phase: any, idx: number) => (
                                      <li key={idx} className="text-sm text-gray-700">
                                        • {phase.assignmentRange || phase.details || 'Manzil recitation'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Homework */}
                        {hasHomework && (
                          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Homework</h4>
                            {assignment.homework.content && (
                              <p className="text-sm text-blue-800 mb-2">{assignment.homework.content}</p>
                            )}
                            {assignment.homework.link && (
                              <a 
                                href={assignment.homework.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {assignment.homework.link}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Qaidah Homework */}
                        {assignment.homework?.qaidahHomework && (
                          <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="text-sm font-semibold text-green-900 mb-2">
                              Qaidah Homework
                            </h4>
                            <p className="text-sm text-green-800">
                              {assignment.homework.qaidahHomework.book === 'qaidah1' ? 'Qaidah 1' : 'Qaidah 2'} - Page {assignment.homework.qaidahHomework.page}
                            </p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'mushaf' && (
            <div>
              {loadingMushaf ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : mushafMistakes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">No mistakes recorded</p>
                  <p className="text-sm text-gray-500 mt-1">This student has no mistakes in their Mushaf yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Personal Mushaf</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Page</span>
                        <input
                          type="number"
                          min="1"
                          max="604"
                          value={mushafPage}
                          onChange={(e) => setMushafPage(Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <InteractiveMushaf
                        currentPage={mushafPage}
                        onPageChange={setMushafPage}
                        mistakes={mushafMistakes.filter(m => m.page === mushafPage)}
                        onMistakeMark={() => {}}
                        readOnly={true}
                        mode="viewing"
                        studentName={student?.fullName || 'Student'}
                      />
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Mistakes on this page</h4>
                      <div className="space-y-2">
                        {mushafMistakes.filter(m => m.page === mushafPage).map((mistake) => (
                          <div key={mistake.id} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                    {mistake.type}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    Surah {mistake.surah}, Ayah {mistake.ayah}
                                  </span>
                                </div>
                                {mistake.note && (
                                  <p className="text-sm text-gray-700">{mistake.note}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {mushafMistakes.filter(m => m.page === mushafPage).length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">No mistakes on this page</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AfterSchoolStudentView;

