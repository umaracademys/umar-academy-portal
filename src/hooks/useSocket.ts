import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_RAW = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
const API_BASE = API_BASE_RAW.endsWith('/api') 
  ? API_BASE_RAW.replace('/api', '') 
  : API_BASE_RAW;

export const useSocket = () => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current token
  const getToken = useCallback(() => {
    return localStorage.getItem('umar_academy_token');
  }, []);

  // Check if token is expired (basic check)
  const isTokenExpired = useCallback((token: string): boolean => {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return true;
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      
      // Check expiration
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume expired on error
    }
  }, []);

  // Disconnect and cleanup
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting Socket.IO...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
      tokenCheckIntervalRef.current = null;
    }
    tokenRef.current = null;
  }, []);

  // Connect socket with current token
  const connectSocket = useCallback(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      return;
    }

    const token = getToken();
    if (!token) {
      console.warn('⚠️ No token available for Socket.IO connection');
      disconnectSocket();
      return;
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      console.warn('⚠️ Token expired - disconnecting socket');
      disconnectSocket();
      return;
    }

    // If token hasn't changed and socket exists and is connected, don't reconnect
    if (socketRef.current && 
        tokenRef.current === token && 
        socketRef.current.connected) {
      return;
    }

    // Disconnect old socket if token changed
    if (socketRef.current && tokenRef.current !== token) {
      console.log('🔄 Token changed, reconnecting Socket.IO...');
      disconnectSocket();
    }

    // Connect new socket
    console.log('🔌 Connecting Socket.IO...');
    const socket = io(API_BASE, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Keep trying
      timeout: 20000,
    });

    // Connection handlers
    socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      tokenRef.current = token;
      
      // Verify room membership after connect
      if (user.role === 'student') {
        socket.emit('join_room', `student:${user.id}`);
        console.log(`✅ Requested join room: student:${user.id}`);
      } else if (user.role === 'teacher') {
        socket.emit('join_room', `teacher:${user.id}`);
        console.log(`✅ Requested join room: teacher:${user.id}`);
      } else if (user.role === 'admin' || user.role === 'superadmin') {
        socket.emit('join_room', 'admins');
        console.log(`✅ Requested join room: admins`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      
      // Auto-reconnect on unexpected disconnects
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('🔄 Attempting to reconnect...');
        reconnectTimeoutRef.current = setTimeout(() => {
          const currentToken = getToken();
          if (isAuthenticated && currentToken && !isTokenExpired(currentToken)) {
            connectSocket();
          }
        }, 2000);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
      
      // Check if it's an auth error
      if (error.message.includes('Authentication error') || 
          error.message.includes('Invalid token') ||
          error.message.includes('expired')) {
        console.warn('⚠️ Socket.IO auth failed - token may be expired');
        // Don't auto-reconnect on auth errors - let user re-login
        disconnectSocket();
      }
    });

    // Listen for permission update events
    socket.on('permissions_updated', () => {
      console.log('🔄 Permissions updated - reconnecting socket...');
      disconnectSocket();
      setTimeout(() => {
        const currentToken = getToken();
        if (isAuthenticated && currentToken) {
          connectSocket();
        }
      }, 1000);
    });

    socketRef.current = socket;
  }, [user, isAuthenticated, getToken, disconnectSocket, isTokenExpired]);

  // Watch for token changes and user changes
  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      return;
    }

    connectSocket();

    // Poll for token changes (every 5 seconds)
    tokenCheckIntervalRef.current = setInterval(() => {
      const currentToken = getToken();
      
      // Check if token changed
      if (currentToken !== tokenRef.current && socketRef.current) {
        console.log('🔄 Token changed, reconnecting...');
        connectSocket();
        return;
      }
      
      // Check if token expired
      if (currentToken && isTokenExpired(currentToken)) {
        console.warn('⚠️ Token expired, disconnecting socket');
        disconnectSocket();
        return;
      }
    }, 5000);

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
      }
      disconnectSocket();
    };
  }, [user, isAuthenticated, connectSocket, disconnectSocket, getToken, isTokenExpired]);

  return socketRef.current;
};
