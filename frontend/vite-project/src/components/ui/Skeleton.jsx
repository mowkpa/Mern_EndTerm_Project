import React from 'react';

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-line/60 rounded-control ${className}`}
      {...props}
    />
  );
};

export const SkeletonRow = ({ cols = 5, className = '' }) => {
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-line ${className}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-5 ${i === 0 ? 'w-1/3' : 'flex-1'} rounded-chip`}
        />
      ))}
    </div>
  );
};

export default Skeleton;
