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
    }
  }, [user, students, getStudentsByTeacher]);

  const loadPdfs = async () => {
    try {
      setLoading(true);
      const pdfList = await getPdfs(true);
      setPdfs(pdfList);
    } catch (error) {
      console.error('Error loading PDFs:', error);
      alert('Failed to load PDFs');
    } finally {
      setLoading(false);
    }
  };

  const loadAnnotations = async () => {
    if (!selectedPdf) return;
    try {
      setLoadingAnnotations(true);
      const annotation = await getPdfAnnotations(selectedPdf.id);
      if (annotation) {
        setNotes(annotation.notes || '');
        setAnnotations(annotation.annotations || []);
      } else {
        setNotes('');
        setAnnotations([]);
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
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
      await savePdfAnnotations(selectedPdf.id, newAnnotations, notesText);
      setNotes(notesText);
      setAnnotations(newAnnotations);
      alert('Annotations saved successfully!');
    } catch (error: any) {
      console.error('Error saving annotations:', error);
      alert(error.message || 'Failed to save annotations');
    } finally {
      setSaving(false);
    }
  };

  const handleAnnotationsChange = (newAnnotations: any[]) => {
    setAnnotations(newAnnotations);
  };

  const handleAssignToStudent = async () => {
    if (!selectedPdf || !selectedStudentId) {
      alert('Please select a student');
      return;
    }

    const student = assignedStudents.find(s => (s.id || (s as any)._id) === selectedStudentId);
    if (!student) {
      alert('Student not found');
      return;
    }

    try {
      await assignPdfAsHomework(
        selectedPdf.id,
        selectedStudentId,
        student.fullName || (student as any).fullName
      );
      alert(`Homework assigned to ${student.fullName || (student as any).fullName} successfully!`);
      setShowStudentSelector(false);
      setSelectedStudentId('');
    } catch (error: any) {
      console.error('Error assigning homework:', error);
      alert(error.message || 'Failed to assign homework');
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
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">📄 PDF Teaching Materials</h1>
          <button
            onClick={() => setShowStudentSelector(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Assign to Student
          </button>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPdf?.id || ''}
            onChange={(e) => {
              const pdf = pdfs.find(p => p.id === e.target.value);
              setSelectedPdf(pdf || null);
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select a PDF...</option>
            {pdfs.map((pdf) => (
              <option key={pdf.id} value={pdf.id}>
                {pdf.title}
              </option>
            ))}
          </select>
        </div>
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
        ) : (
          <PdfAnnotationViewer
            pdfUrl={selectedPdf.fileUrl}
            annotations={annotations}
            readOnly={false}
            onAnnotationsChange={handleAnnotationsChange}
            onSave={handleSaveAnnotations}
            showControls={true}
            initialPage={1}
            initialNotes={notes}
          />
        )}
      </div>

      {showStudentSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Assign to Student</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Choose a student...</option>
                  {assignedStudents.map((student) => (
                    <option
                      key={student.id || (student as any)._id}
                      value={student.id || (student as any)._id}
                    >
                      {student.fullName || (student as any).fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowStudentSelector(false);
                    setSelectedStudentId('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignToStudent}
                  disabled={!selectedStudentId}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
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

