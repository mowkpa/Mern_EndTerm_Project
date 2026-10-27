import React from 'react';
import Badge from './Badge';

export const StatusBadge = ({ status, className = '' }) => {
  const statusMap = {
    approved: { label: 'Approved', variant: 'mine', dot: true },
    pending: { label: 'Awaiting approval', variant: 'pending', dot: true },
    checked_in: { label: 'Checked in', variant: 'free', dot: true },
    completed: { label: 'Completed', variant: 'neutral', dot: false },
    rejected: { label: 'Rejected', variant: 'danger', dot: true },
    cancelled: { label: 'Cancelled', variant: 'neutral', dot: false },
    expired: { label: 'Expired', variant: 'neutral', dot: false },
    no_show: { label: 'No show', variant: 'danger', dot: true },
  };

  const config = statusMap[status] || {
    label: status ? String(status).replace(/_/g, ' ') : 'Unknown',
    variant: 'neutral',
    dot: false,
  };

  return (
    <Badge variant={config.variant} dot={config.dot} className={className}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
