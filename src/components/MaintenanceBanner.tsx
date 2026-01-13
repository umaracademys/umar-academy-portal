import React, { useState, useEffect } from 'react';

interface MaintenanceMode {
  enabled: boolean;
  message: string;
}

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';

const MaintenanceBanner: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceMode>({ enabled: false, message: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch maintenance mode status
    const fetchMaintenanceMode = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/maintenance`);
        if (response.ok) {
          const data = await response.json();
          setMaintenanceMode(data);
        }
      } catch (error) {
        console.error('Error fetching maintenance mode:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceMode();

    // Listen for maintenance mode changes via WebSocket
    // This will be handled by the socket connection in BackendDataContext
    // For now, we'll poll every 30 seconds
    const interval = setInterval(fetchMaintenanceMode, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading || !maintenanceMode.enabled) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-white px-4 py-3 text-center font-semibold shadow-lg z-50 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        <span className="text-xl">⚠️</span>
        <p className="text-sm md:text-base">{maintenanceMode.message}</p>
      </div>
    </div>
  );
};

export default MaintenanceBanner;
