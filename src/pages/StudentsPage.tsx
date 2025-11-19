import React, { useState, useMemo } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/Card';
import StudentRegistrationForm from '../components/StudentRegistrationForm';

const StudentsPage: React.FC = () => {
  const { students, loading } = useBackendData();
  const { refreshData } = useData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showStudentForm, setShowStudentForm] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return students;
    return students.filter((s) =>
      s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.id?.toLowerCase().includes(search.toLowerCase())
    );
  }, [students, search]);

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'enrollment', label: 'Enrollment' },
    { id: 'payments', label: 'Payments' },
    { id: 'progress', label: 'Progress' },
    { id: 'communication', label: 'Communication' }
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
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search students..."
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
          <button
            onClick={() => setShowStudentForm(true)}
            className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-extrabold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg text-sm"
          >
            + Add Student
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm font-medium">Loading students...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm font-medium">No students found</p>
            </div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelected(s)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition ${
                  selected?.id === s.id
                    ? 'bg-soft-primary border-l-4 border-l-primary'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-extrabold text-sm shadow-lg">
                    {s.avatar ? (
                      <img src={s.avatar} alt={s.fullName} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      getInitials(s.fullName || '')
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-primary truncate">{s.fullName}</div>
                    <div className="text-xs text-gray-500 truncate">{s.program || 'No program'}</div>
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
            <p className="text-lg font-semibold">Select a student to view details</p>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
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
              {activeTab === 'profile' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Personal Information</h2>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Student:</span>
                        <p className="text-primary font-extrabold">{selected.fullName}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-primary/70">Parent:</span>
                        <p className="text-primary font-extrabold">{selected.parentName || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-primary/70">Email:</span>
                        <p className="text-primary font-extrabold">{selected.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-primary/70">Contact:</span>
                        <p className="text-primary font-extrabold">{selected.contact || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-primary/70">Program:</span>
                        <p className="text-primary font-extrabold">{selected.program || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-primary/70">Status:</span>
                        <span className={`ml-2 px-3 py-1 rounded-full text-xs font-extrabold ${
                          selected.status === 'active'
                            ? 'bg-primary text-white'
                            : 'bg-soft-primary text-primary'
                        }`}>
                          {selected.status || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'enrollment' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Enrollment Details</h2>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-semibold text-primary/70">Enrolled Date:</span>
                        <p className="text-primary font-extrabold">{selected.enrolledDate || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-primary/70">Assigned Teacher:</span>
                        <p className="text-primary font-extrabold">{selected.assignedTeacher || 'Unassigned'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-primary/70">Schedule:</span>
                        <p className="text-primary font-extrabold">
                          {selected.schedule
                            ? `${selected.schedule.days?.join(', ') || 'N/A'} ${selected.schedule.startTime || ''} - ${selected.schedule.endTime || ''}`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'payments' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Payment Information</h2>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-semibold text-primary/70">Tuition Fee:</span>
                        <p className="text-primary font-extrabold">${selected.tuitionFee || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-primary/70">Registration Amount:</span>
                        <p className="text-primary font-extrabold">${selected.registrationAmount || 'N/A'}</p>
                      </div>
                      <p className="text-gray-600 text-sm">Payment history will be displayed here.</p>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'progress' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Progress Reports</h2>
                    <p className="text-gray-600">Progress reports and analytics will be displayed here.</p>
                  </div>
                </Card>
              )}

              {activeTab === 'communication' && (
                <Card>
                  <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-primary mb-4">Communication Log</h2>
                    <p className="text-gray-600">Communication history and messages will be displayed here.</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Student Registration Form Modal */}
      {showStudentForm && (
        <StudentRegistrationForm
          onClose={() => {
            setShowStudentForm(false);
            if (refreshData) {
              refreshData();
            }
          }}
        />
      )}
    </div>
  );
};

export default StudentsPage;

