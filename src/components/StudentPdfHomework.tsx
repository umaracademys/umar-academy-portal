import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PdfAnnotationViewer from './PdfAnnotationViewer';
import { getStudentPdfHomework, PdfDocument } from '../services/pdfApi';
import Card from './Card';

interface PdfHomeworkItem {
  assignmentId: string;
  pdf: PdfDocument;
  annotations: {
    annotations: Array<{
      id: string;
      page: number;
      type: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
      color: string;
      text?: string;
      note?: string;
      points?: Array<{ x: number; y: number }>;
    }>;
    notes: string;
    annotatedBy: string;
    annotatedAt: string;
  };
  assignedByName: string;
  assignedAt: string;
  status: string;
}

const StudentPdfHomework: React.FC = () => {
  const { user } = useAuth();
  const [homework, setHomework] = useState<PdfHomeworkItem[]>([]);
  const [selectedHomework, setSelectedHomework] = useState<PdfHomeworkItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomework();
  }, []);

  const loadHomework = async () => {
    try {
      setLoading(true);
      const studentId = (user as any)?.id || (user as any)?._id || (user as any)?.userId;
      if (!studentId) {
        console.error('Student ID not found');
        return;
      }
      const homeworkList = await getStudentPdfHomework(studentId);
      setHomework(homeworkList);
    } catch (error) {
      console.error('Error loading PDF homework:', error);
      alert('Failed to load PDF homework');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'student') {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md">
        <p className="text-red-600">Access denied. Students only.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b p-4">
        <h1 className="text-2xl font-bold text-gray-800">📄 PDF Homework Assignments</h1>
        <p className="text-sm text-gray-600 mt-1">View and complete your PDF homework assignments</p>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-80 border-r bg-gray-50 overflow-y-auto p-4">
          <h2 className="font-semibold mb-4">Assignments</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 mt-2 text-sm">Loading...</p>
            </div>
          ) : homework.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No PDF homework assigned</p>
            </div>
          ) : (
            <div className="space-y-2">
              {homework.map((item) => (
                <Card
                  key={item.assignmentId}
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedHomework?.assignmentId === item.assignmentId ? 'border-primary-500 border-2' : ''
                  }`}
                  onClick={() => setSelectedHomework(item)}
                >
                  <h3 className="font-semibold text-gray-800">{item.pdf.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Assigned by {item.assignedByName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.assignedAt).toLocaleDateString()}
                  </p>
                  {item.annotations?.notes && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      "{item.annotations.notes.substring(0, 50)}..."
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {!selectedHomework ? (
            <div className="h-full flex items-center justify-center">
              <Card className="p-8 text-center">
                <p className="text-gray-500 text-lg">Select an assignment to view</p>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="bg-white border-b p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{selectedHomework.pdf.title}</h2>
                    <p className="text-sm text-gray-600">
                      Assigned by {selectedHomework.assignedByName} •{' '}
                      {new Date(selectedHomework.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-sm ${
                      selectedHomework.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedHomework.status}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <PdfAnnotationViewer
                  pdfUrl={selectedHomework.pdf.fileUrl}
                  annotations={selectedHomework.annotations?.annotations || []}
                  readOnly={true}
                  showControls={true}
                  initialPage={1}
                  initialNotes={selectedHomework.annotations?.notes || ''}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPdfHomework;

