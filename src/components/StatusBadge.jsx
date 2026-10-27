import React from 'react';

export default function StatusBadge({ status }) {
  const configs = {
    pending: {
      label: 'Pending Approval',
      className: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
      dotClass: 'bg-amber-500',
    },
    approved: {
      label: 'Approved',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
      dotClass: 'bg-emerald-500',
    },
    checked_in: {
      label: 'Checked In',
      className: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
      dotClass: 'bg-blue-500',
    },
    completed: {
      label: 'Completed',
      className: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20',
      dotClass: 'bg-slate-400',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
      dotClass: 'bg-rose-500',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-slate-50 text-slate-500 border-slate-200 ring-slate-500/10',
      dotClass: 'bg-slate-300',
    },
    expired: {
      label: 'Expired',
      className: 'bg-slate-50 text-slate-500 border-slate-200 ring-slate-500/10',
      dotClass: 'bg-slate-300',
    },
    no_show: {
      label: 'No-Show',
      className: 'bg-red-50 text-red-700 border-red-200 ring-red-500/20',
      dotClass: 'bg-red-500',
    },
  };

  const config = configs[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-2xs ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}
