import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Users as UsersIcon, Search, Shield, UserCheck, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

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

  const getQuotaLabel = (role) => {
    switch (role) {
      case 'student':
        return '3 slots/day';
      case 'faculty':
        return '6 slots/day';
      case 'admin':
        return 'Unlimited';
      default:
        return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-line">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
          Users
        </h1>
        <p className="text-xs sm:text-sm text-text-2 mt-1">
          Manage campus privileges, quotas, and role delegations for students, faculty, and
          administrators.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-500">Loading user directory...</p>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users match your query"
          description="Try searching with a different name, email, or department."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Booking Quota</th>
                  <th className="py-3.5 px-4">Account Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = u._id === currentUser._id;
                  const isUpdating = updatingId === u._id;

                  return (
                    <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {u.department || <span className="text-slate-400">—</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          {getQuotaLabel(u.role)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            disabled={isUpdating || (isCurrent && u.role === 'admin')}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className="text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-hidden disabled:opacity-50 transition-colors"
                          >
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="admin">Administrator</option>
                          </select>
                          {isUpdating && <Spinner size="sm" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
