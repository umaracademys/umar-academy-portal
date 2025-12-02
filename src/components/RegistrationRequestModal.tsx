import React, { useState, useEffect } from 'react';
import { AdminNotification } from '../types';

interface RegistrationRequestModalProps {
  notification: AdminNotification;
  onClose: () => void;
  onApprove?: (notificationId: string, registrationData: any) => void;
}

const RegistrationRequestModal: React.FC<RegistrationRequestModalProps> = ({ 
  notification, 
  onClose,
  onApprove 
}) => {
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If registrationData is already in notification, use it
    if (notification.registrationData) {
      setRegistrationData(notification.registrationData);
      setLoading(false);
    } else {
      // Otherwise, fetch the full notification to get registrationData
      loadNotificationDetails();
    }
  }, [notification]);

  const loadNotificationDetails = async () => {
    try {
      const token = localStorage.getItem('umar_academy_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/admin-notifications/${notification.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRegistrationData(data.registrationData || null);
      }
    } catch (error) {
      console.error('Error loading notification details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-primary">Loading registration details...</p>
        </div>
      </div>
    );
  }

  if (!registrationData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full border-2 border-primary">
          <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] p-6 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-accent">Registration Request</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-accent text-primary rounded-full hover:bg-accent/90 font-bold text-xl"
              >
                ×
              </button>
            </div>
          </div>
          <div className="p-6">
            <p className="text-primary">Registration data not available.</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-extrabold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8 border-2 border-primary max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-accent">📋 Registration Request Details</h2>
              <p className="text-accent/90 text-sm mt-1">
                Submitted on {formatDate(notification.createdAt?.toString() || '')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-accent text-primary rounded-full hover:bg-accent/90 font-bold text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Student Information */}
          <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary">
            <h3 className="font-extrabold text-primary text-lg mb-4">👤 Student Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-primary/70 font-semibold">Full Name</p>
                <p className="text-primary font-bold">{registrationData.studentFullName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-primary/70 font-semibold">Date of Birth</p>
                <p className="text-primary font-bold">{formatDate(registrationData.studentDateOfBirth) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-primary/70 font-semibold">Gender</p>
                <p className="text-primary font-bold">{registrationData.studentGender || 'N/A'}</p>
              </div>
              <div>
                <p className="text-primary/70 font-semibold">Current Grade/Level</p>
                <p className="text-primary font-bold">{registrationData.studentGrade || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Parent/Guardian Information */}
          <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary">
            <h3 className="font-extrabold text-primary text-lg mb-4">👨‍👩‍👧 Parent/Guardian Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-primary/70 font-semibold">Full Name</p>
                <p className="text-primary font-bold">{registrationData.parentFullName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-primary/70 font-semibold">Email</p>
                <p className="text-primary font-bold">{registrationData.parentEmail || 'N/A'}</p>
              </div>
              <div>
                <p className="text-primary/70 font-semibold">Phone Number</p>
                <p className="text-primary font-bold">{registrationData.parentPhone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-primary/70 font-semibold">Relationship</p>
                <p className="text-primary font-bold">{registrationData.parentRelationship || 'N/A'}</p>
              </div>
              {registrationData.alternateContact && (
                <div>
                  <p className="text-primary/70 font-semibold">Alternate Contact</p>
                  <p className="text-primary font-bold">{registrationData.alternateContact}</p>
                </div>
              )}
            </div>
          </div>

          {/* Program Information */}
          <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary">
            <h3 className="font-extrabold text-primary text-lg mb-4">📚 Program Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-primary/70 font-semibold">Preferred Program</p>
                <p className="text-primary font-bold">{registrationData.program || 'N/A'}</p>
              </div>
              {registrationData.preferredSchedule && (
                <div>
                  <p className="text-primary/70 font-semibold">Preferred Schedule</p>
                  <p className="text-primary font-bold">{registrationData.preferredSchedule}</p>
                </div>
              )}
              <div className="md:col-span-2">
                <p className="text-primary/70 font-semibold">Previous Quran Education</p>
                <p className="text-primary font-bold">
                  {registrationData.previousQuranEducation ? 'Yes' : 'No'}
                </p>
                {registrationData.previousQuranEducation && registrationData.previousEducationDetails && (
                  <div className="mt-2">
                    <p className="text-primary/70 font-semibold">Details</p>
                    <p className="text-primary">{registrationData.previousEducationDetails}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          {(registrationData.streetAddress || registrationData.city || registrationData.state || registrationData.zipCode) && (
            <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary">
              <h3 className="font-extrabold text-primary text-lg mb-4">📍 Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {registrationData.streetAddress && (
                  <div className="md:col-span-2">
                    <p className="text-primary/70 font-semibold">Street Address</p>
                    <p className="text-primary font-bold">{registrationData.streetAddress}</p>
                  </div>
                )}
                {registrationData.city && (
                  <div>
                    <p className="text-primary/70 font-semibold">City</p>
                    <p className="text-primary font-bold">{registrationData.city}</p>
                  </div>
                )}
                {registrationData.state && (
                  <div>
                    <p className="text-primary/70 font-semibold">State/Province</p>
                    <p className="text-primary font-bold">{registrationData.state}</p>
                  </div>
                )}
                {registrationData.zipCode && (
                  <div>
                    <p className="text-primary/70 font-semibold">Zip/Postal Code</p>
                    <p className="text-primary font-bold">{registrationData.zipCode}</p>
                  </div>
                )}
                {registrationData.country && (
                  <div>
                    <p className="text-primary/70 font-semibold">Country</p>
                    <p className="text-primary font-bold">{registrationData.country}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {(registrationData.emergencyContactName || registrationData.emergencyContactPhone) && (
            <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary">
              <h3 className="font-extrabold text-primary text-lg mb-4">🚨 Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {registrationData.emergencyContactName && (
                  <div>
                    <p className="text-primary/70 font-semibold">Name</p>
                    <p className="text-primary font-bold">{registrationData.emergencyContactName}</p>
                  </div>
                )}
                {registrationData.emergencyContactPhone && (
                  <div>
                    <p className="text-primary/70 font-semibold">Phone</p>
                    <p className="text-primary font-bold">{registrationData.emergencyContactPhone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Information */}
          {(registrationData.specialNeeds || registrationData.notes) && (
            <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary">
              <h3 className="font-extrabold text-primary text-lg mb-4">📝 Additional Information</h3>
              {registrationData.specialNeeds && (
                <div className="mb-4">
                  <p className="text-primary/70 font-semibold mb-2">Special Needs or Accommodations</p>
                  <p className="text-primary">{registrationData.specialNeeds}</p>
                </div>
              )}
              {registrationData.notes && (
                <div>
                  <p className="text-primary/70 font-semibold mb-2">Additional Notes</p>
                  <p className="text-primary">{registrationData.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Siblings Information */}
          {registrationData.siblings && registrationData.siblings.length > 0 && (
            <div className="border-2 border-primary rounded-lg p-4 bg-soft-primary">
              <h3 className="font-extrabold text-primary text-lg mb-4">👨‍👩‍👧‍👦 Siblings</h3>
              <div className="space-y-2">
                {registrationData.siblings.map((sibling: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded border border-primary/30">
                    <p className="text-primary font-bold">{sibling.name || 'N/A'}</p>
                    {sibling.age && <p className="text-primary/70 text-sm">Age: {sibling.age}</p>}
                    {sibling.grade && <p className="text-primary/70 text-sm">Grade: {sibling.grade}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t-2 border-primary bg-gray-50">
          {onApprove && (
            <button
              onClick={() => {
                onApprove(notification.id, registrationData);
                onClose();
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-extrabold shadow-lg"
            >
              ✓ Create Student from This
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 border-2 border-primary rounded-lg hover:bg-primary/10 font-extrabold text-primary shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationRequestModal;

