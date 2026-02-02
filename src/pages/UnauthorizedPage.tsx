import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="heading-page text-gray-900">Access denied</h1>
        <p className="body-text text-gray-600 mt-2">
          You don&apos;t have permission to view this page.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => window.history.back()}
            className="min-h-[44px] fullWidthMobile"
          >
            Go back
          </Button>
          <Link to={user ? '/dashboard' : '/login'}>
            <Button
              variant="outline"
              className="min-h-[44px] fullWidthMobile w-full sm:w-auto"
            >
              {user ? 'Dashboard' : 'Log in'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
