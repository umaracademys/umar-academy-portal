import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

  // Helper function to extract permissions from token
  const extractPermissionsFromToken = useCallback((token: string): any => {
    try {
      const base64Url = token.split('.')[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        return decoded;
      }
    } catch (error) {
      console.warn('⚠️ Failed to extract data from token:', error);
    }
    return null;
  }, []);

  // Helper function to check if token is expired
  const isTokenExpired = useCallback((token: string): boolean => {
    try {
      const decoded = extractPermissionsFromToken(token);
      if (decoded && decoded.exp) {
        return decoded.exp < Date.now() / 1000;
      }
    } catch (error) {
      console.warn('⚠️ Failed to check token expiration:', error);
    }
    return true; // Assume expired on error
  }, [extractPermissionsFromToken]);

  // Helper function to load user from localStorage
  const loadUserFromStorage = useCallback(() => {
    const savedUser = localStorage.getItem('umar_academy_user');
    const savedToken = localStorage.getItem('umar_academy_token');
    
    if (savedUser && savedToken) {
      // Check if token is expired
      if (isTokenExpired(savedToken)) {
        console.warn('⚠️ AuthContext: Saved token is expired, clearing auth data');
        localStorage.removeItem('umar_academy_user');
        localStorage.removeItem('umar_academy_token');
        setUser(null);
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);
        
        // Phase 4: Extract permissions from saved token if not already in user object
        if (!parsedUser.permissions) {
          const decoded = extractPermissionsFromToken(savedToken);
          if (decoded && decoded.permissions) {
            parsedUser.permissions = decoded.permissions;
          }
        }
        
        console.log('✅ AuthContext: User loaded from localStorage:', parsedUser.name, parsedUser.role);
        setUser(parsedUser);
      } catch (error) {
        console.error('❌ AuthContext: Error parsing saved user:', error);
        localStorage.removeItem('umar_academy_user');
        localStorage.removeItem('umar_academy_token');
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [extractPermissionsFromToken, isTokenExpired]);

  // Load user from localStorage on component mount
  useEffect(() => {
    console.log('🔍 AuthContext: Checking for saved user...');
    const savedUser = localStorage.getItem('umar_academy_user');
    const savedToken = localStorage.getItem('umar_academy_token');
    
    console.log('🔍 AuthContext: Saved user exists:', !!savedUser);
    console.log('🔍 AuthContext: Saved token exists:', !!savedToken);
    
    loadUserFromStorage();
    
    console.log('✅ AuthContext: Setting isLoading to false');
    setIsLoading(false);
  }, [loadUserFromStorage]);

  // Define logout function early so it can be used in useEffects
  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    localStorage.removeItem('umar_academy_user');
    localStorage.removeItem('umar_academy_token');
    
    // Phase 2: Broadcast storage event for multi-tab sync
    window.dispatchEvent(new Event('storage'));
  }, []);

  // Phase 2: Multi-tab token sync - Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'umar_academy_token' || e.key === 'umar_academy_user') {
        console.log('🔄 Storage changed in another tab, reloading user...');
        
        const newToken = localStorage.getItem('umar_academy_token');
        const newUser = localStorage.getItem('umar_academy_user');
        
        if (newToken && newUser) {
          // Check if token is expired
          if (isTokenExpired(newToken)) {
            console.warn('⚠️ Token from other tab is expired, logging out...');
            setUser(null);
            return;
          }

          try {
            const parsedUser = JSON.parse(newUser);
            
            // Extract permissions from token if needed
            if (!parsedUser.permissions) {
              const decoded = extractPermissionsFromToken(newToken);
              if (decoded && decoded.permissions) {
                parsedUser.permissions = decoded.permissions;
              }
            }
            
            setUser(parsedUser);
            console.log('✅ AuthContext: User synced from other tab');
          } catch (error) {
            console.error('❌ Error parsing user from storage:', error);
            setUser(null);
          }
        } else {
          // Token/user removed in another tab - logout
          console.log('🔄 Token/user removed in other tab, logging out...');
          setUser(null);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [extractPermissionsFromToken, isTokenExpired]);

  // Phase 2: Periodic token expiration check
  useEffect(() => {
    if (!user) return;

    // Check token expiration every 30 seconds
    const tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem('umar_academy_token');
      if (token) {
        if (isTokenExpired(token)) {
          console.warn('⚠️ Token expired during session, logging out...');
          logout();
        }
      } else {
        // Token removed - logout
        console.warn('⚠️ Token removed, logging out...');
        logout();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [user, isTokenExpired, logout]);

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
        
        // Read error response once (can only read response body once)
        let errorData: any = {};
        try {
          errorData = await response.json().catch(() => ({}));
        } catch (e) {
          // Ignore parse errors
        }

        // Check if account is locked
        const accountLocked = errorData.accountLocked || false;
        const minutesRemaining = errorData.minutesRemaining || null;
        const canRequestUnlock = errorData.canRequestUnlock || false;
        
        if (accountLocked) {
          // Store locked account info for the UI
          (window as any).__lockedAccountInfo = {
            email,
            accountLocked: true,
            minutesRemaining: minutesRemaining || 30,
            canRequestUnlock: canRequestUnlock || true
          };
        } else {
          // Clear any previous locked account info
          delete (window as any).__lockedAccountInfo;
        }
        
        // Phase 5: Handle PERMISSIONS_OUTDATED code - auto logout user
        if (errorData.code === 'PERMISSIONS_OUTDATED') {
          console.log('🔄 Permissions updated - logging out user');
          logout(); // Auto logout on permission change
          errorMessage = 'Your permissions have been updated. Please log in again.';
          setError(errorMessage);
          return false;
        }

        // Provide more specific error messages based on status code
        if (response.status === 401) {
          errorMessage = errorData.error || errorMessage || 'Invalid email, password, or role. Please check your credentials and try again.';
        } else if (response.status === 403) {
          // For 403, use the error message from the response (which includes account lockout info)
          errorMessage = errorData.error || errorMessage || 'Account access denied. Your account may be locked or disabled.';
        } else if (response.status === 429) {
          errorMessage = errorData.error || 'Too many login attempts. Please wait a moment and try again.';
        } else if (response.status === 500) {
          errorMessage = errorData.error || 'Server error. Please try again later.';
        } else if (response.status === 0 || response.status >= 500) {
          errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else {
          // Use error from response if available
          errorMessage = errorData.error || errorMessage;
        }
        
        setError(errorMessage);
        return false;
      }

      const data = await response.json();
      
      if (data.token && data.user) {
        // Phase 4: Extract permissions from JWT token and attach to user object
        try {
          // Decode JWT to extract permissions
          const token = data.token;
          const base64Url = token.split('.')[1];
          if (base64Url) {
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const decoded = JSON.parse(jsonPayload);
            
            // Attach permissions to user object if present in token
            if (decoded.permissions) {
              data.user.permissions = decoded.permissions;
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to extract permissions from token:', error);
          // Continue without permissions (backward compatibility)
        }
        
        // Store token and user data
        localStorage.setItem('umar_academy_token', data.token);
        localStorage.setItem('umar_academy_user', JSON.stringify(data.user));
        
        // Phase 2: Broadcast storage event for multi-tab sync
        window.dispatchEvent(new Event('storage'));
        
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
