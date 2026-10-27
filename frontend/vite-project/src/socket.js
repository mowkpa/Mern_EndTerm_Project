import { io } from 'socket.io-client';

const rawApiUrl = import.meta.env.VITE_API_URL || 'https://mern-endterm-project-mgfj.onrender.com';
const socketUrl = rawApiUrl.replace(/\/+$/, '');

export const socket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true,
  auth: (cb) => {
    cb({ token: localStorage.getItem('slotsync-token') });
  },
  transports: ['websocket', 'polling'],
});
