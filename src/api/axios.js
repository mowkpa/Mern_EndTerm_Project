import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'https://mern-endterm-project-mgfj.onrender.com';
const baseUrl = rawApiUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL: baseUrl + '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('slotsync-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data?.token) {
      localStorage.setItem('slotsync-token', response.data.token);
    }
    return response;
  },
  (error) => {
    // If unauthorized on protected routes (excluding login/register), redirect to login
    if (
      error.response?.status === 401 &&
      !window.location.pathname.includes('/login') &&
      !window.location.pathname.includes('/register') &&
      window.location.pathname !== '/'
    ) {
      localStorage.removeItem('slotsync-token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
