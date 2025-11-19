import React, { useState, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import Card from '../components/Card';

const TeachersPage: React.FC = () => {
  const { teachers, loading } = useBackendData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const filtered = useMemo(() => {
    if (!search) return teachers;
    return teachers.filter((t) =>
      t.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.id?.toLowerCase().includes(search.toLowerCase())
    );
  }, [teachers, search]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'courses', label: 'Courses' },
    { id: 'students', label: 'Students' },
    { id: 'performance', label: 'Performance' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'documents', label: 'Documents' }
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col sm:flex-row h-screen bg-background">
      {/* Sidebar */}
      <div className="w-full sm:w-80 border-r-0 sm:border-r-2 border-b-2 sm:border-b-0 border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search teachers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 pl-10 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition bg-white text-primary font-medium shadow-sm"
            />
            <svg
              className="absolute left-3 top-3.5 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm font-medium">Loading teachers...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm font-medium">No teachers found</p>
            </div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelected(t)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition ${
                  selected?.id === t.id
                    ? 'bg-soft-primary border-l-4 border-l-primary'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                    {t.avatar ? (
                      <img src={t.avatar} alt={t.fullName} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      getInitials(t.fullName || '')
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-primary truncate">{t.fullName}</div>
                    <div className="text-xs text-gray-500 truncate">{t.department || 'No department'}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 p-4 sm:p-6 overflow-auto bg-background">
        {!selected ? (
          <div className="text-center text-gray-500 pt-20">
            <svg
              className="h-12 w-12 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-lg font-semibold">Select a teacher to view details</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold text-primary mb-2 flex items-center gap-3">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {selected.fullName}
              </h1>
              <p className="text-gray-600">{selected.email}</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-semibold text-sm transition ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-primary hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'overview' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Teacher Information</h2>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Name:</span>
                        <p className="text-primary font-extrabold">{selected.fullName}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Email:</span>
                        <p className="text-primary font-extrabold">{selected.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Contact:</span>
                        <p className="text-primary font-extrabold">{selected.phoneNumber || selected.contact || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Department:</span>
                        <p className="text-primary font-extrabold">{selected.department || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Location:</span>
                        <p className="text-primary font-extrabold">{selected.location || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Status:</span>
                        <span className={`ml-2 px-3 py-1 rounded-full text-xs font-extrabold ${
                          selected.status === 'active'
                            ? 'bg-success text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {selected.status || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Assigned Students:</span>
                        <p className="text-primary font-extrabold">
                          {Array.isArray(selected.assignedStudents) ? selected.assignedStudents.length : 0} students
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'courses' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Courses</h2>
                    <p className="text-gray-600">Course assignments will be displayed here.</p>
                  </div>
                </Card>
              )}

              {activeTab === 'students' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Assigned Students</h2>
                    <p className="text-gray-600">
                      {Array.isArray(selected.assignedStudents) && selected.assignedStudents.length > 0
                        ? `${selected.assignedStudents.length} students assigned`
                        : 'No students assigned yet'}
                    </p>
                  </div>
                </Card>
              )}

              {activeTab === 'performance' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Performance Metrics</h2>
                    <p className="text-gray-600">Performance data will be displayed here.</p>
                  </div>
                </Card>
              )}

              {activeTab === 'payroll' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Payroll Information</h2>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Monthly Salary:</span>
                        <p className="text-primary font-extrabold">
                          {selected.payroll?.currency === 'USD' ? '$' : 'Rs'}{selected.payroll?.monthlySalary?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Employment Type:</span>
                        <p className="text-primary font-extrabold">{selected.employmentType || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'documents' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Documents</h2>
                    <p className="text-gray-600">Teacher documents will be displayed here.</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeachersPage;

