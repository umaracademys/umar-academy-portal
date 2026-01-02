import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on component mount
  useEffect(() => {
    console.log('🔍 AuthContext: Checking for saved user...');
    const savedUser = localStorage.getItem('umar_academy_user');
    const savedToken = localStorage.getItem('umar_academy_token');
    
    console.log('🔍 AuthContext: Saved user exists:', !!savedUser);
    console.log('🔍 AuthContext: Saved token exists:', !!savedToken);
    
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('✅ AuthContext: User loaded from localStorage:', parsedUser.name, parsedUser.role);
        setUser(parsedUser);
      } catch (error) {
        console.error('❌ AuthContext: Error parsing saved user:', error);
        localStorage.removeItem('umar_academy_user');
        localStorage.removeItem('umar_academy_token');
      }
    } else {
      console.log('ℹ️ AuthContext: No saved user found, user needs to login');
    }
    console.log('✅ AuthContext: Setting isLoading to false');
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role?: UserRole): Promise<boolean> => {
    setError(null);
    
    // Validate inputs before making request
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }
    
    try {
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const loginUrl = `${API_BASE}/auth/login`;
      
      console.log('🔐 Attempting login:', { email, role, url: loginUrl });
      
      // Use secure login endpoint with password verification
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      });

      // Log response status for debugging
      console.log('📡 Login response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Invalid credentials. Please try again.';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.warn('⚠️ Login error response:', errorData);
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const textError = await response.text();
            console.warn('⚠️ Login error (non-JSON):', textError);
            if (textError) {
              errorMessage = textError;
            }
          } catch (textError) {
            console.warn('⚠️ Could not parse error response');
          }
        }
        
        // Provide more specific error messages based on status code
        if (response.status === 401) {
          errorMessage = errorMessage || 'Invalid email, password, or role. Please check your credentials and try again.';
        } else if (response.status === 403) {
          errorMessage = errorMessage || 'Account access denied. Your account may be locked or disabled.';
        } else if (response.status === 429) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (response.status === 0 || response.status >= 500) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        }
        
        setError(errorMessage);
        return false;
      }

      const data = await response.json();
      
      if (data.token && data.user) {
        // Store token and user data
        localStorage.setItem('umar_academy_token', data.token);
        localStorage.setItem('umar_academy_user', JSON.stringify(data.user));
        
        setUser(data.user);
        console.log('✅ Login successful:', data.user.name, data.user.role);
        return true;
      }
      
      setError('Invalid response from server');
      return false;
      
    } catch (err: any) {
      console.error('❌ Login error:', err);
      
      // Provide more specific error messages
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Failed to connect to server. Please check your internet connection and ensure the backend is running.');
      } else if (err.message) {
        setError(`Login failed: ${err.message}`);
      } else {
        setError('Failed to connect to server. Please try again.');
      }
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem('umar_academy_user');
    localStorage.removeItem('umar_academy_token');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    error,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
