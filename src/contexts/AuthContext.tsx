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
    
    try {
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      
      // Use secure login endpoint with password verification
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
        setError(errorData.error || 'Invalid credentials. Please try again.');
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
      
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('Failed to connect to server. Please try again.');
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
