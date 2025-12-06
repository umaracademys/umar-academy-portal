import React, { useState, useEffect } from 'react';
import { useBackendData } from '../contexts/BackendDataContext';
import { useAuth } from '../contexts/AuthContext';
import AiSuggestionsInput from './AiSuggestionsInput';

interface PairDailyReportFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const PairDailyReportForm: React.FC<PairDailyReportFormProps> = ({ onClose, onSuccess }) => {
  const { 
    getTeacherPairs,
    getPairStudents,
    createPairDailyReport,
    teachers,
    students
  } = useBackendData();
  const { user } = useAuth();

  const [pairs, setPairs] = useState<any[]>([]);
  const [pairStudents, setPairStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPair, setSelectedPair] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  const [formData, setFormData] = useState({
    sabq: '',
    sabqi: '',
    manzil: '',
    mistakes: '',
    correctionMethod: '',
    behaviorNote: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadPairs();
  }, []);

  useEffect(() => {
    if (selectedPair) {
      loadPairStudents();
    }
  }, [selectedPair]);

  const loadPairs = async () => {
    try {
      const data = await getTeacherPairs();
      // Filter pairs where current teacher is teacher1 or teacher2
      const currentTeacher = teachers.find(t => t.email === user?.email);
      if (currentTeacher) {
        const filtered = data.filter((pair: any) => 
          (pair.teacher1?._id === currentTeacher.id || pair.teacher1 === currentTeacher.id) ||
          (pair.teacher2?._id === currentTeacher.id || pair.teacher2 === currentTeacher.id)
        );
        setPairs(filtered);
      } else {
        setPairs(data);
      }
    } catch (error) {
      console.error('Error loading pairs:', error);
    }
  };

  const loadPairStudents = async () => {
    if (!selectedPair) return;
    try {
      const data = await getPairStudents({ pair: selectedPair, status: 'active' });
      setPairStudents(data);
    } catch (error) {
      console.error('Error loading pair students:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPair || !selectedStudent) {
      alert('Please select a pair and student');
      return;
    }

    const currentTeacher = teachers.find(t => t.email === user?.email);
    if (!currentTeacher) {
      alert('Teacher not found');
      return;
    }

    setLoading(true);
    try {
      await createPairDailyReport({
        pair: selectedPair,
        student: selectedStudent,
        teacher: currentTeacher.id,
        ...formData
      });
      alert('Daily report submitted successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit daily report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-primary px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-primary">Daily Report</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Teacher Pair</label>
              <select
                value={selectedPair}
                onChange={(e) => {
                  setSelectedPair(e.target.value);
                  setSelectedStudent('');
                }}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary"
                required
              >
                <option value="">Select Pair</option>
                {pairs.map(pair => (
                  <option key={pair._id} value={pair._id}>
                    {pair.name} ({pair.program})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary"
                required
                disabled={!selectedPair}
              >
                <option value="">Select Student</option>
                {pairStudents.map(ps => (
                  <option key={ps._id} value={ps.student?._id || ps.student}>
                    {ps.student?.fullName || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sabq</label>
            <AiSuggestionsInput
              value={formData.sabq}
              onChange={(value) => setFormData({ ...formData, sabq: value })}
              category="general"
              placeholder="Enter sabq details..."
              multiline
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sabqi</label>
            <AiSuggestionsInput
              value={formData.sabqi}
              onChange={(value) => setFormData({ ...formData, sabqi: value })}
              category="general"
              placeholder="Enter sabqi details..."
              multiline
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Manzil</label>
            <AiSuggestionsInput
              value={formData.manzil}
              onChange={(value) => setFormData({ ...formData, manzil: value })}
              category="general"
              placeholder="Enter manzil details..."
              multiline
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mistakes</label>
            <AiSuggestionsInput
              value={formData.mistakes}
              onChange={(value) => setFormData({ ...formData, mistakes: value })}
              category="mistakes"
              placeholder="Describe mistakes observed..."
              multiline
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Correction Method</label>
            <AiSuggestionsInput
              value={formData.correctionMethod}
              onChange={(value) => setFormData({ ...formData, correctionMethod: value })}
              category="tajweed"
              placeholder="How were mistakes corrected..."
              multiline
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Behavior Note</label>
            <AiSuggestionsInput
              value={formData.behaviorNote}
              onChange={(value) => setFormData({ ...formData, behaviorNote: value })}
              category="evaluation"
              placeholder="Behavior observations..."
              multiline
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PairDailyReportForm;

