import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import PdfAnnotationViewer from './PdfAnnotationViewer';
import { getPdfs, getPdfAnnotations, savePdfAnnotations, assignPdfAsHomework, PdfDocument } from '../services/pdfApi';
import Card from './Card';
import Header from './Header';

const TeacherPdfViewer: React.FC = () => {
  const { user } = useAuth();
  const { students, getStudentsByTeacher } = useData();
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<PdfDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPdfs();
  }, []);

  useEffect(() => {
    if (selectedPdf) {
      loadAnnotations();
    } else {
      setAnnotations([]);
      setNotes('');
    }
  }, [selectedPdf]);

  useEffect(() => {
    if (user?.role === 'teacher') {
      const teacherId = (user as any).teacherId || (user as any).id;
      const assigned = getStudentsByTeacher(teacherId);
      setAssignedStudents(assigned);
      console.log('📚 TeacherPdfViewer - Assigned students:', assigned.length, assigned);
    }
  }, [user, students, getStudentsByTeacher]);

  const loadPdfs = async () => {
    try {
      setLoading(true);
      setError(null);
      const pdfList = await getPdfs(true);
      console.log('📚 Loaded PDFs:', pdfList.length, pdfList);
      setPdfs(pdfList);
      if (pdfList.length === 0) {
        setError('No PDFs available. Please ask a super admin to upload PDFs.');
      }
    } catch (error) {
      console.error('Error loading PDFs:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load PDFs';
      setError(errorMessage);
      alert(`Failed to load PDFs: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAnnotations = async () => {
    if (!selectedPdf) return;
    try {
      setLoadingAnnotations(true);
      setError(null);
      const pdfId = selectedPdf.id || selectedPdf._id;
      if (!pdfId) {
        throw new Error('PDF ID is missing');
      }
      console.log('📚 Loading annotations for PDF:', pdfId);
      const annotation = await getPdfAnnotations(pdfId);
      if (annotation) {
        setNotes(annotation.notes || '');
        setAnnotations(annotation.annotations || []);
        console.log('📚 Loaded annotations:', annotation.annotations?.length || 0);
      } else {
        setNotes('');
        setAnnotations([]);
        console.log('📚 No annotations found for this PDF');
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load annotations';
      setError(errorMessage);
      setNotes('');
      setAnnotations([]);
    } finally {
      setLoadingAnnotations(false);
    }
  };

  const handleSaveAnnotations = async (newAnnotations: any[], notesText: string) => {
    if (!selectedPdf) return;
    
    try {
      setSaving(true);
      setError(null);
      const pdfId = selectedPdf.id || selectedPdf._id;
      if (!pdfId) {
        throw new Error('PDF ID is missing');
      }
      await savePdfAnnotations(pdfId, newAnnotations, notesText);
      setNotes(notesText);
      setAnnotations(newAnnotations);
      alert('Annotations saved successfully!');
    } catch (error: any) {
      console.error('Error saving annotations:', error);
      const errorMessage = error.message || 'Failed to save annotations';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleAnnotationsChange = (newAnnotations: any[]) => {
    setAnnotations(newAnnotations);
  };

  const handleAssignToStudentWithId = async (studentId: string, studentName: string) => {
    if (!selectedPdf) {
      throw new Error('Please select a PDF first');
    }

    const pdfId = selectedPdf.id || selectedPdf._id;
    if (!pdfId) {
      throw new Error('PDF ID is missing');
    }
    
    console.log('📚 Saving annotations before assignment...');
    try {
      await savePdfAnnotations(pdfId, annotations, notes);
      console.log('✅ Annotations saved successfully');
    } catch (saveError: any) {
      console.warn('⚠️ Warning: Failed to save annotations before assignment:', saveError);
    }
    
    console.log('📚 Assigning PDF homework:', {
      pdfId,
      studentId,
      studentName
    });
    
    await assignPdfAsHomework(pdfId, studentId, studentName);
  };

  const handleAssignToStudent = async () => {
    if (!selectedPdf) {
      alert('Please select a PDF first');
      return;
    }
    
    if (!selectedStudentId) {
      alert('Please select a student');
      return;
    }

    const studentIdStr = selectedStudentId.toString();
    const student = assignedStudents.find(s => {
      const sId = (s.id || (s as any)._id)?.toString();
      return sId === studentIdStr;
    });
    
    if (!student) {
      console.error('Student not found. Selected ID:', selectedStudentId, 'Available students:', assignedStudents.map(s => ({
        id: s.id || (s as any)._id,
        name: s.fullName || (s as any).fullName
      })));
      alert('Student not found. Please try selecting again.');
      return;
    }

    try {
      await handleAssignToStudentWithId(studentIdStr, student.fullName || (student as any).fullName);
      alert(`Homework assigned to ${student.fullName || (student as any).fullName} successfully!`);
      setShowStudentSelector(false);
      setSelectedStudentId('');
    } catch (error: any) {
      console.error('Error assigning homework:', error);
      const errorMessage = error.message || 'Failed to assign homework';
      
      if (errorMessage.includes('No annotations found') || errorMessage.includes('annotate')) {
        alert('Please add at least one annotation to the PDF before assigning it as homework. You can add highlights, text, drawings, or shapes.');
      } else {
        alert(errorMessage);
      }
    }
  };

  if (user?.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card className="p-6">
            <p className="text-red-600 font-medium">Access denied. Teachers only.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">PDF Teaching Materials</h1>
              <p className="text-sm text-gray-600">
                Annotate PDFs and assign them as homework to your students
              </p>
            </div>
            {selectedPdf && (
              <button
                onClick={() => setShowStudentSelector(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Assign to Student
              </button>
            )}
          </div>

          {/* PDF Selection */}
          <Card className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select PDF Document
            </label>
            <select
              value={selectedPdf?.id || selectedPdf?._id || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                console.log('📚 PDF selected:', selectedId);
                const pdf = pdfs.find(p => (p.id || p._id) === selectedId);
                console.log('📚 Found PDF:', pdf);
                if (pdf) {
                  setSelectedPdf(pdf);
                  setError(null);
                } else {
                  setSelectedPdf(null);
                  setError('PDF not found');
                }
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white shadow-sm"
              disabled={loading}
            >
              <option value="">
                {loading ? 'Loading PDFs...' : 'Select a PDF document...'}
              </option>
              {pdfs.map((pdf) => (
                <option key={pdf.id || pdf._id} value={pdf.id || pdf._id}>
                  {pdf.title}
                </option>
              ))}
            </select>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* PDF Viewer Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {!selectedPdf ? (
            <div className="h-[600px] flex items-center justify-center p-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No PDF Selected</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select a PDF document from the dropdown above to start annotating
                </p>
                {loading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Loading PDFs...</span>
                  </div>
                )}
              </div>
            </div>
          ) : loadingAnnotations ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Loading annotations...</p>
              </div>
            </div>
          ) : selectedPdf.fileUrl ? (
            <PdfAnnotationViewer
              pdfUrl={selectedPdf.fileUrl}
              annotations={annotations}
              readOnly={false}
              onAnnotationsChange={handleAnnotationsChange}
              onSave={handleSaveAnnotations}
              showControls={true}
              initialPage={1}
              initialNotes={notes}
              pdfTitle={selectedPdf.title}
              pdfFilename={selectedPdf.filename || selectedPdf.originalFilename || ''}
              pdfId={selectedPdf.id || selectedPdf._id}
              onAssignHomework={async (studentId: string, studentName: string) => {
                await handleAssignToStudentWithId(studentId, studentName);
              }}
              assignedStudents={assignedStudents}
            />
          ) : (
            <div className="h-[600px] flex items-center justify-center p-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF File Missing</h3>
                <p className="text-sm text-gray-600">
                  The PDF file URL is missing. Please contact support if this issue persists.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Selector Modal */}
      {showStudentSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Assign to Student</h2>
              <button
                onClick={() => {
                  setShowStudentSelector(false);
                  setSelectedStudentId('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    const studentId = e.target.value;
                    console.log('📚 Student selected:', studentId);
                    setSelectedStudentId(studentId);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 bg-white shadow-sm"
                >
                  <option value="">Choose a student...</option>
                  {assignedStudents.length === 0 ? (
                    <option value="" disabled>No students assigned to you</option>
                  ) : (
                    assignedStudents.map((student) => {
                      const studentId = (student.id || (student as any)._id)?.toString();
                      const studentName = student.fullName || (student as any).fullName || 'Unknown';
                      return (
                        <option key={studentId} value={studentId}>
                          {studentName}
                        </option>
                      );
                    })
                  )}
                </select>
                {assignedStudents.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    You need to have students assigned to you to assign PDF homework.
                  </p>
                )}
              </div>
              
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowStudentSelector(false);
                    setSelectedStudentId('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignToStudent}
                  disabled={!selectedStudentId}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Assign Homework
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TeacherPdfViewer;
