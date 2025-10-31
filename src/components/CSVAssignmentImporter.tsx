import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Program } from '../types/assignment';

interface CSVAssignmentImporterProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface CSVRow {
  title: string;
  description: string;
  type: 'classwork' | 'homework';
  classworkType?: 'sabq' | 'sabqi' | 'manzil';
  program: string;
  students: string; // Comma-separated student emails
  dueDate: string;
  // Special fields for "After School Reading" program
  assignedTeacher?: string;
  readingLink?: string;
  comments?: string;
}

const CSVAssignmentImporter: React.FC<CSVAssignmentImporterProps> = ({ onClose, onSuccess }) => {
  const { students, addAssignment } = useData();
  const { user } = useAuth();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock programs - in real app, this would come from API
  React.useEffect(() => {
    const mockPrograms: Program[] = [
      { id: '1', name: 'Full Time HQ', description: 'Full-time Hifz program', students: ['1', '2', '3'], createdAt: new Date(), status: 'active' },
      { id: '2', name: 'Part Time HQ', description: 'Part-time Hifz program', students: ['1', '4', '5'], createdAt: new Date(), status: 'active' },
      { id: '3', name: 'After School Reading', description: 'After school reading program', students: ['2', '3', '6'], createdAt: new Date(), status: 'active' }
    ];
    setPrograms(mockPrograms);
  }, []);

  const parseCSV = (csvText: string): CSVRow[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const requiredHeaders = ['title', 'description', 'type', 'program', 'students', 'duedate'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      setErrors([`Missing required headers: ${missingHeaders.join(', ')}`]);
      return [];
    }

    const data: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= headers.length) {
        const row: CSVRow = {
          title: values[headers.indexOf('title')] || '',
          description: values[headers.indexOf('description')] || '',
          type: (values[headers.indexOf('type')] || 'classwork') as 'classwork' | 'homework',
          classworkType: values[headers.indexOf('classworktype')] as 'sabq' | 'sabqi' | 'manzil' || 'sabq',
          program: values[headers.indexOf('program')] || '',
          students: values[headers.indexOf('students')] || '',
          dueDate: values[headers.indexOf('duedate')] || '',
          // Special fields for "After School Reading"
          assignedTeacher: values[headers.indexOf('assignedteacher')] || '',
          readingLink: values[headers.indexOf('readinglink')] || '',
          comments: values[headers.indexOf('comments')] || ''
        };
        data.push(row);
      }
    }
    
    return data;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsedData = parseCSV(csvText);
      setCsvData(parsedData);
      setPreviewData(parsedData.slice(0, 5)); // Show first 5 rows for preview
    };
    reader.readAsText(file);
  };

  const validateData = (data: CSVRow[]): string[] => {
    const validationErrors: string[] = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because CSV is 1-indexed and we skip header
      
      if (!row.title.trim()) {
        validationErrors.push(`Row ${rowNum}: Title is required`);
      }
      if (!row.description.trim()) {
        validationErrors.push(`Row ${rowNum}: Description is required`);
      }
      if (!row.program.trim()) {
        validationErrors.push(`Row ${rowNum}: Program is required`);
      }
      if (!row.students.trim()) {
        validationErrors.push(`Row ${rowNum}: Students are required`);
      }
      if (!row.dueDate.trim()) {
        validationErrors.push(`Row ${rowNum}: Due date is required`);
      }
      
      // Validate program exists
      const program = programs.find(p => p.name.toLowerCase() === row.program.toLowerCase());
      if (!program) {
        validationErrors.push(`Row ${rowNum}: Program "${row.program}" not found`);
      }
      
      // Validate students exist
      const studentEmails = row.students.split(',').map(email => email.trim());
      const invalidStudents = studentEmails.filter(email => 
        !students.some(s => s.email.toLowerCase() === email.toLowerCase())
      );
      if (invalidStudents.length > 0) {
        validationErrors.push(`Row ${rowNum}: Students not found: ${invalidStudents.join(', ')}`);
      }
    });
    
    return validationErrors;
  };

  const handleImport = async () => {
    const validationErrors = validateData(csvData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);
    
    try {
      const assignmentPromises = csvData.map(async (row) => {
        const program = programs.find(p => p.name.toLowerCase() === row.program.toLowerCase());
        const studentEmails = row.students.split(',').map(email => email.trim());
        const studentIds = students
          .filter(s => studentEmails.some(email => s.email.toLowerCase() === email.toLowerCase()))
          .map(s => s.id);

        return addAssignment({
          title: row.title,
          description: row.description,
          type: row.type,
          classworkType: row.classworkType,
          program: program?.id || '',
          assignedBy: user?.id || '',
          assignedTo: studentIds,
          dueDate: new Date(row.dueDate),
          createdAt: new Date(),
          status: 'published',
          submissions: [],
          notifications: []
        });
      });

      await Promise.all(assignmentPromises);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error importing assignments:', error);
      setErrors(['Failed to import assignments. Please check your data and try again.']);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `title,description,type,classworktype,program,students,duedate,assignedteacher,readinglink,comments
"Quran Memorization - Surah Al-Fatiha","Memorize verses 1-7 of Surah Al-Fatiha",classwork,sabq,"Full Time HQ","student1@example.com,student2@example.com","2024-01-15",,,
"Arabic Grammar Exercise","Complete exercises 1-10 in Arabic grammar book",homework,,"Part Time HQ","student3@example.com","2024-01-20",,,
"Reading Assignment - Chapter 5","Read and summarize chapter 5 from the textbook",classwork,,"After School Reading","student4@example.com,student5@example.com","2024-01-18","teacher1@example.com","https://example.com/reading-material","Please focus on the main themes"`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assignment_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">CSV Assignment Importer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">How to Use CSV Import</h3>
            <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
              <li>Download the CSV template below</li>
              <li>Fill in your assignment data following the template format</li>
              <li>Upload the completed CSV file</li>
              <li>Review the preview and fix any errors</li>
              <li>Click "Import Assignments" to create all assignments</li>
            </ol>
          </div>

          {/* Template Download */}
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-800">CSV Template</h3>
              <p className="text-sm text-gray-600">Download the template to get started</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
            >
              Download Template
            </button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="space-y-4">
              <div className="text-4xl">📁</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Upload CSV File</h3>
                <p className="text-gray-600">Click to select your CSV file or drag and drop</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
              >
                Choose File
              </button>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">Validation Errors</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  Preview ({csvData.length} assignments)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            row.type === 'classwork' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {row.type} {row.type === 'classwork' && `(${row.classworkType})`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.program}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.students}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.dueDate}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.assignedTeacher || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.readingLink ? (
                            <a href={row.readingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              Link
                            </a>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.comments || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 5 && (
                <div className="px-6 py-3 bg-gray-50 text-center text-sm text-gray-600">
                  ... and {csvData.length - 5} more assignments
                </div>
              )}
            </div>
          )}

          {/* Import Button */}
          {csvData.length > 0 && (
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={loading || errors.length > 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Importing...' : `Import ${csvData.length} Assignments`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVAssignmentImporter;
