import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
  size = 'md',
}) => {
  const variants = {
    free: 'bg-free-bg text-free border border-free/20',
    mine: 'bg-mine-bg text-mine border border-mine/20',
    pending: 'bg-pending-bg text-pending border border-pending/20',
    booked: 'bg-booked text-text-2 border border-line',
    danger: 'bg-danger-bg text-danger border border-danger/20',
    neutral: 'bg-paper text-text-2 border border-line',
  };

  const dotColors = {
    free: 'bg-free',
    mine: 'bg-mine',
    pending: 'bg-pending',
    booked: 'bg-text-2',
    danger: 'bg-danger',
    neutral: 'bg-text-2',
  };

  const sizes = {
    sm: 'text-[11px] px-1.5 py-0.5 rounded-chip font-medium',
    md: 'text-xs px-2.5 py-0.5 rounded-chip font-medium',
    lg: 'text-sm px-3 py-1 rounded-chip font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 select-none ${
        variants[variant] || variants.neutral
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            dotColors[variant] || 'bg-text-2'
          }`}
        />
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
