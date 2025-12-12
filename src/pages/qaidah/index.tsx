import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const QaidahIndex: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to page 1 by default
    navigate('/qaidah/1', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Qaidah...</p>
      </div>
    </div>
  );
};

export default QaidahIndex;
