import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isDeveloperAccount } from '../utils/dataMasking';

const DeveloperModeIndicator: React.FC = () => {
  const { user } = useAuth();
  const isDeveloper = isDeveloperAccount(user);

  if (!isDeveloper) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <span className="text-lg">🔒</span>
      <div>
        <div className="font-bold text-sm">Developer Mode</div>
        <div className="text-xs opacity-90">Data masking active</div>
      </div>
    </div>
  );
};

export default DeveloperModeIndicator;

