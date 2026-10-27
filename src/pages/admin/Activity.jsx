import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity as ActivityIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DoorOpen,
  CalendarOff,
  UserCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../components/ui/Toast';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const ACTION_CONFIG = {
  approve: {
    label: 'Approved',
    variant: 'success',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  reject: {
    label: 'Rejected',
    variant: 'danger',
    icon: XCircle,
    iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  admin_cancel: {
    label: 'Admin Cancel',
    variant: 'danger',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  room_create: {
    label: 'Room Created',
    variant: 'primary',
    icon: DoorOpen,
    iconColor: 'text-primary-600 bg-primary-50 border-primary-200',
  },
  room_update: {
    label: 'Room Updated',
    variant: 'neutral',
    icon: DoorOpen,
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  room_deactivate: {
    label: 'Room Deactivated',
    variant: 'warning',
    icon: DoorOpen,
    iconColor: 'text-slate-600 bg-slate-100 border-slate-300',
  },
  blackout_create: {
    label: 'Blackout Added',
    variant: 'warning',
    icon: CalendarOff,
    iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  blackout_delete: {
    label: 'Blackout Removed',
    variant: 'neutral',
    icon: CalendarOff,
    iconColor: 'text-slate-600 bg-slate-50 border-slate-200',
  },
  role_change: {
    label: 'Role Changed',
    variant: 'info',
    icon: UserCheck,
    iconColor: 'text-violet-600 bg-violet-50 border-violet-200',
  },
};

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function Activity() {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(
    async (targetPage = 1) => {
      try {
        setLoading(true);
        const res = await api.get('/admin/activity', {
          params: { page: targetPage, limit: 25 },
        });
        setLogs(res.data.activity || []);
        setPage(res.data.page || 1);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
      } catch (err) {
        addToast(err.response?.data?.message || 'Failed to fetch activity log', 'error');
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-ink tracking-tight">
              Activity Log
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Audit
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-2 mt-1">
            Complete, immutable chronological trail of administrative decisions, room updates, and
            privilege delegations.
          </p>
        </div>

        <div className="text-xs text-text-2">
          Total actions: <span className="font-semibold text-ink">{totalCount}</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Panel key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-1/3 h-4" />
                <Skeleton className="w-2/3 h-3" />
              </div>
              <Skeleton className="w-16 h-5 rounded-full" />
            </Panel>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity recorded yet"
          description="Administrative actions such as approvals, rejections, room changes, and blackouts will appear here."
        />
      ) : (
        <div className="space-y-3">
          <div className="divide-y divide-line border border-line rounded-2xl bg-surface overflow-hidden shadow-xs">
            {logs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] || {
                label: log.action,
                variant: 'neutral',
                icon: ActivityIcon,
                iconColor: 'text-slate-600 bg-slate-100 border-slate-200',
              };
              const IconComponent = cfg.icon;

              return (
                <div
                  key={log._id}
                  className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${cfg.iconColor}`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-ink">
                        {log.actor?.name || 'Administrator'}
                      </span>
                      {log.actor?.role && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {log.actor.role}
                        </span>
                      )}
                      <Badge variant={cfg.variant} size="sm">
                        {cfg.label}
                      </Badge>
                      <span className="text-xs text-text-3 ml-auto shrink-0 flex items-center gap-1" title={new Date(log.createdAt).toLocaleString()}>
                        <Clock className="w-3 h-3 text-text-3" />
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-text-1 mt-1 break-words">
                      {log.summary}
                    </p>

                    {/* Metadata details snippet if relevant */}
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-3 font-mono">
                        {log.meta.note && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-sans">
                            Note: "{log.meta.note}"
                          </span>
                        )}
                        {log.meta.affectedBookings > 0 && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-sans">
                            {log.meta.affectedBookings} booking(s) affected
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1">
              <span className="text-xs text-text-2">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  iconRight={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
