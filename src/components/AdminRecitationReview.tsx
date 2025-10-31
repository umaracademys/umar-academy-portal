import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { RecitationReview } from '../types';

interface AdminRecitationReviewProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AdminRecitationReview: React.FC<AdminRecitationReviewProps> = ({ onClose, onSuccess }) => {
  const { recitationReviews, updateRecitationReview, convertRecitationReviewToAssignment, refreshData } = useData();
  const { user } = useAuth();

  const [selectedReview, setSelectedReview] = useState<RecitationReview | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Get pending reviews
  const pendingReviews = recitationReviews.filter(
    r => r.status === 'pending_review'
  );

  const handleReview = async (review: RecitationReview, action: 'approve' | 'reject') => {
    try {
      await updateRecitationReview(review.id, {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: user?.id || '',
        reviewedAt: new Date()
      });
      
      alert(`Recitation review ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      await refreshData();
      setSelectedReview(null);
    } catch (error) {
      console.error('Error updating review:', error);
      alert('Failed to update review');
    }
  };

  const handleConvertToAssignment = async (review: RecitationReview) => {
    if (!confirm(`Convert this ${review.recitationType} review for ${review.studentName} to an assignment?`)) {
      return;
    }

    setIsConverting(true);
    try {
      await convertRecitationReviewToAssignment(review.id);
      alert('Recitation review converted to assignment successfully! You can now edit it to add homework.');
      await refreshData();
      setSelectedReview(null);
      onSuccess();
    } catch (error) {
      console.error('Error converting review:', error);
      alert('Failed to convert review to assignment');
    } finally {
      setIsConverting(false);
    }
  };

  const getRecitationIcon = (type: string) => {
    switch (type) {
      case 'sabq': return '📖';
      case 'sabqi': return '📚';
      case 'manzil': return '📿';
      default: return '📝';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🔍 Recitation Review Management</h2>
              <p className="text-purple-100 mt-1">
                {pendingReviews.length} pending review{pendingReviews.length !== 1 ? 's' : ''} awaiting your review
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {pendingReviews.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">No pending recitation reviews</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReviews.map((review) => (
                <div
                  key={review.id}
                  className="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-3xl">{getRecitationIcon(review.recitationType)}</span>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {review.studentName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {review.recitationType.charAt(0).toUpperCase() + review.recitationType.slice(1)} • {review.program}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {review.notes}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>👨‍🏫 {review.teacherName}</span>
                        {review.audioLink && (
                          <a
                            href={review.audioLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            🔊 Listen to Audio
                          </a>
                        )}
                        <span>📅 {new Date(review.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {selectedReview?.id === review.id ? (
                      <div className="ml-4 flex flex-col space-y-2">
                        <button
                          onClick={() => setSelectedReview(null)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="ml-4 flex flex-col space-y-2">
                        <button
                          onClick={() => handleConvertToAssignment(review)}
                          disabled={isConverting}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded text-sm font-medium hover:from-green-700 hover:to-blue-700 disabled:opacity-50"
                        >
                          {isConverting ? 'Converting...' : '✅ Convert to Assignment'}
                        </button>
                        <button
                          onClick={() => handleReview(review, 'approve')}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReview(review, 'reject')}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <p className="text-sm text-gray-600 text-center">
            💡 <strong>Tip:</strong> Click "Convert to Assignment" to create an assignment from the review.
            You can then edit it to add homework before finalizing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminRecitationReview;

