import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export default function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useSelector((state) => state.auth);

  if (loading) return null;

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/search" replace />;
  }

  return children;
}
