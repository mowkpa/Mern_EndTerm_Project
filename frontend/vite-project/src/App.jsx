import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from './store/authSlice';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import { ToastProvider } from './components/Toast';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import MyBookings from './pages/MyBookings';
import MyWaitlist from './pages/MyWaitlist';
import Notifications from './pages/Notifications';

// Admin Pages
import Approvals from './pages/admin/Approvals';
import Rooms from './pages/admin/Rooms';
import Blackouts from './pages/admin/Blackouts';
import Users from './pages/admin/Users';
import Analytics from './pages/admin/Analytics';

export default function App() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());

    // Unauthorized handler
    const handleUnauthorized = () => {
      dispatch(checkAuth());
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [dispatch]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
        <Navbar />

        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated Routes */}
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/waitlist"
              element={
                <ProtectedRoute>
                  <MyWaitlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />

            {/* Admin Only Routes */}
            <Route
              path="/admin/approvals"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['admin']}>
                    <Approvals />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rooms"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['admin']}>
                    <Rooms />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/blackouts"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['admin']}>
                    <Blackouts />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['admin']}>
                    <Users />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['admin']}>
                    <Analytics />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to={user ? '/search' : '/'} replace />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
