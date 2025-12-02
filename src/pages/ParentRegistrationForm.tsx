import React, { useState } from 'react';
import { ProgramType } from '../types';

const ParentRegistrationForm: React.FC = () => {
  const [formData, setFormData] = useState({
    // Student Information
    studentFullName: '',
    studentDateOfBirth: '',
    studentGender: '',
    studentGrade: '',
    
    // Parent/Guardian Information
    parentFullName: '',
    parentEmail: '',
    parentPhone: '',
    parentRelationship: 'Parent',
    alternateContact: '',
    
    // Program Selection
    program: '' as ProgramType | '',
    preferredSchedule: '',
    previousQuranEducation: false,
    previousEducationDetails: '',
    
    // Additional Information
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    specialNeeds: '',
    notes: '',
    
    // Agreement
    agreeToTerms: false,
    agreeToDataCollection: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.studentFullName || !formData.parentFullName || !formData.parentEmail || !formData.parentPhone) {
      setErrorMessage('Please fill in all required fields');
      setSubmitStatus('error');
      return;
    }

    if (!formData.agreeToTerms || !formData.agreeToDataCollection) {
      setErrorMessage('Please agree to the terms and conditions');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSubmitStatus('idle');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/public/student-registration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        setSubmitStatus('success');
        // Reset form
        setFormData({
          studentFullName: '',
          studentDateOfBirth: '',
          studentGender: '',
          studentGrade: '',
          parentFullName: '',
          parentEmail: '',
          parentPhone: '',
          parentRelationship: 'Parent',
          alternateContact: '',
          program: '' as ProgramType | '',
          preferredSchedule: '',
          previousQuranEducation: false,
          previousEducationDetails: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          specialNeeds: '',
          notes: '',
          agreeToTerms: false,
          agreeToDataCollection: false
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit registration');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit registration. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-primary mb-4">
            Student Registration Form
          </h1>
          <p className="text-lg text-primary/70">
            Umar Academy Portal
          </p>
          <p className="text-sm text-primary/60 mt-2">
            Please fill out all required fields. We'll review your application and contact you soon.
          </p>
        </div>

        {/* Success Message */}
        {submitStatus === 'success' && (
          <div className="mb-6 p-6 bg-green-50 border-2 border-green-500 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-3xl">✅</div>
              <div>
                <h3 className="font-extrabold text-green-800 text-lg">Registration Submitted Successfully!</h3>
                <p className="text-green-700 mt-1">
                  Thank you for your interest. We have received your registration request and will review it shortly. 
                  You will receive a confirmation email and we'll contact you soon.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitStatus === 'error' && errorMessage && (
          <div className="mb-6 p-6 bg-red-50 border-2 border-red-500 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-3xl">❌</div>
              <div>
                <h3 className="font-extrabold text-red-800 text-lg">Error</h3>
                <p className="text-red-700 mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl border-2 border-primary p-8">
          {/* Student Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-primary mb-4 pb-2 border-b-2 border-primary">
              Student Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Student Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentFullName}
                  onChange={(e) => setFormData({ ...formData, studentFullName: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  placeholder="Enter student's full name"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.studentDateOfBirth}
                  onChange={(e) => setFormData({ ...formData, studentDateOfBirth: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.studentGender}
                  onChange={(e) => setFormData({ ...formData, studentGender: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Current Grade/Level
                </label>
                <input
                  type="text"
                  value={formData.studentGrade}
                  onChange={(e) => setFormData({ ...formData, studentGrade: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  placeholder="e.g., Grade 5, Beginner"
                />
              </div>
            </div>
          </div>

          {/* Parent/Guardian Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-primary mb-4 pb-2 border-b-2 border-primary">
              Parent/Guardian Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Parent/Guardian Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.parentFullName}
                  onChange={(e) => setFormData({ ...formData, parentFullName: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  placeholder="Enter parent/guardian name"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  placeholder="parent@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  placeholder="+1-555-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Relationship to Student
                </label>
                <select
                  value={formData.parentRelationship}
                  onChange={(e) => setFormData({ ...formData, parentRelationship: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                >
                  <option value="Parent">Parent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Alternate Contact
                </label>
                <input
                  type="tel"
                  value={formData.alternateContact}
                  onChange={(e) => setFormData({ ...formData, alternateContact: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  placeholder="Optional alternate phone"
                />
              </div>
            </div>
          </div>

          {/* Program Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-primary mb-4 pb-2 border-b-2 border-primary">
              Program Selection
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Preferred Program <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value as ProgramType })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                >
                  <option value="">Select Program</option>
                  <option value="Full Time HQ">Full Time HQ</option>
                  <option value="Part Time HQ">Part Time HQ</option>
                  <option value="After School Reading">After School Reading</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Preferred Schedule
                </label>
                <input
                  type="text"
                  value={formData.preferredSchedule}
                  onChange={(e) => setFormData({ ...formData, preferredSchedule: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  placeholder="e.g., Monday-Friday 9am-12pm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.previousQuranEducation}
                    onChange={(e) => setFormData({ ...formData, previousQuranEducation: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-semibold text-primary">
                    Student has previous Quran education
                  </span>
                </label>
              </div>
              {formData.previousQuranEducation && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-extrabold text-primary mb-2">
                    Previous Education Details
                  </label>
                  <textarea
                    value={formData.previousEducationDetails}
                    onChange={(e) => setFormData({ ...formData, previousEducationDetails: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                    rows={3}
                    placeholder="Please describe previous Quran education experience..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-primary mb-4 pb-2 border-b-2 border-primary">
              Address Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">State/Province</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Zip/Postal Code</label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-primary mb-4 pb-2 border-b-2 border-primary">
              Emergency Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-primary mb-4 pb-2 border-b-2 border-primary">
              Additional Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Special Needs or Accommodations
                </label>
                <textarea
                  value={formData.specialNeeds}
                  onChange={(e) => setFormData({ ...formData, specialNeeds: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  rows={3}
                  placeholder="Please describe any special needs or accommodations required..."
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-primary mb-2">
                  Additional Notes or Comments
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-primary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-primary bg-white"
                  rows={3}
                  placeholder="Any additional information you'd like to share..."
                />
              </div>
            </div>
          </div>

          {/* Terms and Agreement */}
          <div className="mb-8 p-4 bg-soft-primary rounded-lg border-2 border-primary">
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.agreeToTerms}
                  onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                  className="w-5 h-5 mt-1"
                />
                <span className="text-sm text-primary">
                  I agree to the terms and conditions and understand that this is a registration request that will be reviewed by the academy. <span className="text-red-500">*</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.agreeToDataCollection}
                  onChange={(e) => setFormData({ ...formData, agreeToDataCollection: e.target.checked })}
                  className="w-5 h-5 mt-1"
                />
                <span className="text-sm text-primary">
                  I consent to the collection and processing of the information provided for registration purposes. <span className="text-red-500">*</span>
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 bg-primary text-accent rounded-lg hover:bg-primary/90 font-extrabold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-105 transition-all"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Registration Request'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-primary/60 text-sm">
          <p>© {new Date().getFullYear()} Umar Academy. All rights reserved.</p>
          <p className="mt-2">For questions, please contact us at admin@umaracademy.org</p>
        </div>
      </div>
    </div>
  );
};

export default ParentRegistrationForm;

