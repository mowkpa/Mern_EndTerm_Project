import React from 'react';

export const Avatar = ({ name = 'User', size = 'md', className = '' }) => {
  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const sizes = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  };

  return (
    <div
      className={`rounded-full bg-mine-bg text-mine border border-mine/20 flex items-center justify-center font-bold select-none shrink-0 ${
        sizes[size] || sizes.md
      } ${className}`}
      title={name}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
