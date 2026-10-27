import React from 'react';
import Button from './Button';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`py-12 px-6 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4 ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-panel bg-paper border border-line flex items-center justify-center text-text-2">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div className="space-y-1">
        <h4 className="font-heading font-semibold text-base text-ink">{title}</h4>
        {description && (
          <p className="text-xs sm:text-sm text-text-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
