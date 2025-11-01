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
    const savedUser = localStorage.getItem('umar_academy_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('umar_academy_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role?: UserRole): Promise<boolean> => {
    setError(null);
    
    try {
      // Fetch all users from backend (this will include newly created users)
      const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const users = await response.json();
      console.log('🔍 Available users:', users.length);
      console.log('📧 Looking for:', email, 'with role:', role);
      
      // Find user by email and role
      const foundUser = users.find((u: any) => 
        u.email === email && u.role === role
      );
      
      if (foundUser) {
        // For demo purposes, accept any password for existing users
        const userData: User = {
          id: foundUser._id,
          name: foundUser.name || foundUser.fullName || 'Unknown',
          email: foundUser.email,
          role: foundUser.role,
          avatar: foundUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name || foundUser.fullName || 'User')}&background=random&color=fff`,
        };
        
        setUser(userData);
        localStorage.setItem('umar_academy_user', JSON.stringify(userData));
        console.log('✅ Login successful:', userData.name, userData.role);
        return true;
      }
      
      // If user not found, show available users for debugging
      console.log('❌ User not found. Available users:');
      users.forEach((u: any) => {
        console.log(`  - ${u.email} (${u.role}) - ${u.name || u.fullName}`);
      });
      
      setError(`User not found. Please check email and role. Available users: ${users.length}`);
      return false;
      
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('Failed to connect to server');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem('umar_academy_user');
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
