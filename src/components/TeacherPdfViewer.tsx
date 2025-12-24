import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import PdfAnnotationViewer from './PdfAnnotationViewer';
import { getPdfs, getPdfAnnotations, savePdfAnnotations, assignPdfAsHomework, PdfDocument } from '../services/pdfApi';
import Card from './Card';

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
      const pdfId = selectedPdf.id || selectedPdf._id;
      if (!pdfId) {
        throw new Error('PDF ID is missing');
      }
      
      // Save annotations first (even if empty) to ensure they exist in the backend
      console.log('📚 Saving annotations before assignment...');
      try {
        await savePdfAnnotations(pdfId, annotations, notes);
        console.log('✅ Annotations saved successfully');
      } catch (saveError: any) {
        console.warn('⚠️ Warning: Failed to save annotations before assignment:', saveError);
        // Continue with assignment anyway - backend might allow it
      }
      
      console.log('📚 Assigning PDF homework:', {
        pdfId,
        studentId: studentIdStr,
        studentName: student.fullName || (student as any).fullName
      });
      
      await assignPdfAsHomework(
        pdfId,
        studentIdStr,
        student.fullName || (student as any).fullName
      );
      alert(`Homework assigned to ${student.fullName || (student as any).fullName} successfully!`);
      setShowStudentSelector(false);
      setSelectedStudentId('');
    } catch (error: any) {
      console.error('Error assigning homework:', error);
      const errorMessage = error.message || 'Failed to assign homework';
      
      // Provide more helpful error message
      if (errorMessage.includes('No annotations found') || errorMessage.includes('annotate')) {
        alert('Please add at least one annotation to the PDF before assigning it as homework. You can add highlights, text, drawings, or shapes.');
      } else {
        alert(errorMessage);
      }
    }
  };

  if (user?.role !== 'teacher') {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md">
        <p className="text-red-600">Access denied. Teachers only.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="bg-white border-b p-3 sm:p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">📄 PDF Teaching Materials</h1>
          <button
            onClick={() => setShowStudentSelector(true)}
            className="px-4 py-2.5 text-base sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 touch-manipulation min-h-[44px] sm:min-h-0"
          >
            Assign to Student
          </button>
        </div>
        <div className="flex gap-2">
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
            className="flex-1 px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 touch-manipulation"
          >
            <option value="">Select a PDF...</option>
            {pdfs.map((pdf) => (
              <option key={pdf.id || pdf._id} value={pdf.id || pdf._id}>
                {pdf.title}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {!selectedPdf ? (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 text-center">
              <p className="text-gray-500 text-lg">Select a PDF to start teaching</p>
              {loading && <p className="text-gray-400 text-sm mt-2">Loading PDFs...</p>}
            </Card>
          </div>
        ) : loadingAnnotations ? (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading annotations...</p>
            </Card>
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
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 text-center">
              <p className="text-red-600 text-lg">PDF file URL is missing</p>
              <p className="text-gray-500 text-sm mt-2">Please contact support if this issue persists.</p>
            </Card>
          </div>
        )}
      </div>

      {showStudentSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Assign to Student</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    const studentId = e.target.value;
                    console.log('📚 Student selected:', studentId);
                    setSelectedStudentId(studentId);
                  }}
                  className="w-full px-3 py-2.5 text-base sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 touch-manipulation"
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
                  <p className="text-xs text-gray-500 mt-1">You need to have students assigned to you to assign PDF homework.</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowStudentSelector(false);
                    setSelectedStudentId('');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 text-base sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:bg-gray-400 touch-manipulation min-h-[44px] sm:min-h-0"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignToStudent}
                  disabled={!selectedStudentId}
                  className="w-full sm:w-auto px-4 py-2.5 text-base sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] sm:min-h-0"
                >
                  Assign
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

