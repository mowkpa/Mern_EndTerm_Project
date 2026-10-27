import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Users as UsersIcon,
  Search,
  Shield,
  UserCheck,
  AlertCircle,
  GraduationCap,
  Briefcase,
  ShieldAlert,
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/ui/Toast';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Panel } from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const ROLE_BADGES = {
  student: { variant: 'neutral', label: 'Student', quota: '3 slots / day' },
  faculty: { variant: 'primary', label: 'Faculty', quota: '6 slots / day' },
  admin: { variant: 'danger', label: 'Admin', quota: 'Unlimited' },
};

export default function Users() {
  const { user: currentUser } = useSelector((state) => state.auth);
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/users', { params: { search, limit: 50 } });
      setUsers(res.data.users || []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to fetch user list', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, addToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.role === newRole) return;
    if (targetUser._id === currentUser._id && newRole !== 'admin') {
      addToast('Administrators cannot demote their own account.', 'error');
      return;
    }

    try {
      setUpdatingId(targetUser._id);
      const res = await api.patch(`/users/${targetUser._id}/role`, { role: newRole });
      addToast(res.data.message || 'User role updated successfully.', 'success');
      setUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update user role', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
              User Directory & Roles
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {users.length} Listed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Manage campus accounts, permissions, and booking quotas for students, faculty, and administrators.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-text-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name, email, or department..."
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-line bg-surface focus:outline-hidden focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Users Table / List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Panel key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="w-32 h-4" />
                  <Skeleton className="w-48 h-3" />
                </div>
              </div>
              <Skeleton className="w-28 h-8 rounded-lg" />
            </Panel>
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users found"
          description="Try searching with a different name, email, or department identifier."
        />
      ) : (
        <div className="divide-y divide-line border border-line rounded-2xl bg-surface overflow-hidden shadow-xs">
          {users.map((u) => {
            const isSelf = u._id === currentUser._id;
            const isUpdating = updatingId === u._id;
            const roleInfo = ROLE_BADGES[u.role] || ROLE_BADGES.student;

            return (
              <div
                key={u._id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar name={u.name} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink truncate">{u.name}</span>
                      {isSelf && (
                        <span className="text-[10px] font-bold text-primary-700 bg-primary-50 border border-primary-200 px-1.5 py-0.2 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-2 truncate mt-0.5">
                      {u.email} • {u.department || 'General Member'}
                    </p>
                  </div>
                </div>

                {/* Role Selector & Quota */}
                <div className="flex items-center gap-4 shrink-0 sm:self-center">
                  <div className="text-right hidden sm:block">
                    <p className="text-[11px] font-medium text-text-3">Daily Quota</p>
                    <p className="text-xs font-semibold text-ink">{roleInfo.quota}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      disabled={isUpdating || (isSelf && u.role === 'admin')}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-line bg-surface text-ink focus:outline-hidden focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      title={isSelf ? 'You cannot demote your own account' : 'Assign role'}
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
