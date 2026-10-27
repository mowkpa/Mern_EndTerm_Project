import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import Button from './Button';

export const ErrorState = ({
  title = 'Something went wrong',
  description = 'Could not load data from the server. Please check your connection and try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`py-12 px-6 flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4 ${className}`}
    >
      <div className="w-12 h-12 rounded-panel bg-danger-bg border border-danger/20 flex items-center justify-center text-danger">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h4 className="font-heading font-semibold text-base text-ink">{title}</h4>
        {description && (
          <p className="text-xs sm:text-sm text-text-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Try again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
