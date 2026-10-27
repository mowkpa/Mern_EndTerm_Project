import React from 'react';

export const Stat = ({
  label,
  value,
  delta,
  deltaType = 'neutral', // 'positive' | 'negative' | 'neutral'
  description,
  className = '',
}) => {
  const deltaColors = {
    positive: 'text-free bg-free-bg',
    negative: 'text-danger bg-danger-bg',
    neutral: 'text-text-2 bg-paper',
  };

  return (
    <div
      className={`bg-surface border border-line rounded-panel p-5 space-y-2 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-text-2 tracking-wide uppercase">
          {label}
        </span>
        {delta && (
          <span
            className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-chip tabular-nums ${
              deltaColors[deltaType] || deltaColors.neutral
            }`}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="font-heading font-bold text-2xl sm:text-3xl text-ink tabular-nums">
        {value}
      </div>
      {description && <p className="text-xs text-text-2">{description}</p>}
    </div>
  );
};

export default Stat;
