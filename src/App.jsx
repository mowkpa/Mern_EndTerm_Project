import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from './store/authSlice';

// Components
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import { ToastProvider } from './components/ui/Toast';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
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
import Activity from './pages/admin/Activity';
import DevUiShowcase from './pages/DevUiShowcase';

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
      <AppShell>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {import.meta.env.DEV && <Route path="/dev/ui" element={<DevUiShowcase />} />}

          {/* Authenticated Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/admin/activity"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['admin']}>
                  <Activity />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={user ? '/home' : '/'} replace />} />
        </Routes>
      </AppShell>
    </ToastProvider>
  );
}
