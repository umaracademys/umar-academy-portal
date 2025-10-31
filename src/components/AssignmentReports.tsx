import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { AssignmentReport, Program } from '../types/assignment';

interface AssignmentReportsProps {
  onClose: () => void;
}

const AssignmentReports: React.FC<AssignmentReportsProps> = ({ onClose }) => {
  const { students, assignments } = useData();
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [reportData, setReportData] = useState<AssignmentReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock programs - in real app, this would come from API
  useEffect(() => {
    const mockPrograms: Program[] = [
      { id: '1', name: 'Full Time HQ', description: 'Full-time Hifz program', students: ['1', '2', '3'], createdAt: new Date(), status: 'active' },
      { id: '2', name: 'Part Time HQ', description: 'Part-time Hifz program', students: ['1', '4', '5'], createdAt: new Date(), status: 'active' },
      { id: '3', name: 'After School Reading', description: 'After school reading program', students: ['2', '3', '6'], createdAt: new Date(), status: 'active' }
    ];
    setPrograms(mockPrograms);
  }, []);

  const generateReport = async () => {
    if (!selectedProgram) return;

    setLoading(true);
    try {
      // Mock report generation - in real app, this would be an API call
      const program = programs.find(p => p.id === selectedProgram);
      if (!program) return;

      const programStudents = students.filter(s => program.students.includes(s.id));
      const programAssignments = assignments.filter(a => a.program === selectedProgram);

      const studentStats = programStudents.map(student => {
        const studentAssignments = programAssignments.filter(a => a.assignedTo.includes(student.id));
        const submittedAssignments = studentAssignments.filter(a => 
          a.submissions.some(s => s.studentId === student.id)
        );
        const grades = submittedAssignments
          .map(a => a.submissions.find(s => s.studentId === student.id)?.grade)
          .filter(g => g !== undefined) as number[];
        
        return {
          studentId: student.id,
          studentName: student.fullName,
          totalAssignments: studentAssignments.length,
          submittedAssignments: submittedAssignments.length,
          averageGrade: grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0,
          assignments: studentAssignments.flatMap(a => 
            a.submissions.filter(s => s.studentId === student.id)
          )
        };
      });

      const report: AssignmentReport = {
        programId: program.id,
        programName: program.name,
        totalAssignments: programAssignments.length,
        completedAssignments: programAssignments.filter(a => 
          a.submissions.length === a.assignedTo.length
        ).length,
        pendingAssignments: programAssignments.filter(a => 
          a.submissions.length < a.assignedTo.length
        ).length,
        studentStats
      };

      setReportData(report);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const csvContent = [
      ['Student Name', 'Total Assignments', 'Submitted', 'Average Grade'],
      ...reportData.studentStats.map(stat => [
        stat.studentName,
        stat.totalAssignments.toString(),
        stat.submittedAssignments.toString(),
        stat.averageGrade.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.programName}_assignment_report.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // In a real app, you would use a library like jsPDF
    alert('PDF export functionality would be implemented here');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Assignment Reports</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Program Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Program
          </label>
          <div className="flex space-x-4">
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a program</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <button
              onClick={generateReport}
              disabled={!selectedProgram || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Report Data */}
        {reportData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800">Total Assignments</h3>
                <p className="text-3xl font-bold text-blue-600">{reportData.totalAssignments}</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800">Completed</h3>
                <p className="text-3xl font-bold text-green-600">{reportData.completedAssignments}</p>
              </div>
              <div className="bg-yellow-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-800">Pending</h3>
                <p className="text-3xl font-bold text-yellow-600">{reportData.pendingAssignments}</p>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Export CSV
              </button>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Export PDF
              </button>
            </div>

            {/* Student Statistics Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  Student Statistics - {reportData.programName}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Assignments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.studentStats.map((stat, index) => (
                      <tr key={stat.studentId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {stat.studentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.totalAssignments}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.submittedAssignments}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.averageGrade.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${stat.totalAssignments > 0 ? (stat.submittedAssignments / stat.totalAssignments) * 100 : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-xs">
                              {stat.totalAssignments > 0 ? 
                                ((stat.submittedAssignments / stat.totalAssignments) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Individual Student Assignment History */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Individual Assignment History</h3>
              {reportData.studentStats.map(student => (
                <div key={student.studentId} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">{student.studentName}</h4>
                  {student.assignments.length > 0 ? (
                    <div className="space-y-2">
                      {student.assignments.map((assignment, index) => (
                        <div key={index} className="bg-white p-3 rounded border">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800">
                                Assignment #{index + 1}
                              </p>
                              <p className="text-sm text-gray-600">
                                Submitted: {new Date(assignment.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">
                                Grade: {assignment.grade ? `${assignment.grade}%` : 'Not graded'}
                              </p>
                              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                assignment.status === 'graded' ? 'bg-green-100 text-green-800' :
                                assignment.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {assignment.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No assignments submitted yet</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentReports;
