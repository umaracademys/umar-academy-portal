import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_RAW = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
const API_BASE = API_BASE_RAW.endsWith('/api') 
  ? API_BASE_RAW.replace('/api', '') 
  : API_BASE_RAW;

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('umar_academy_token');
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to socket.io server
    const socket = io(API_BASE, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('🔌 Socket.IO connected');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket.IO connection error:', error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return socketRef.current;
};
