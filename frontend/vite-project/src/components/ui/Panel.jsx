import React from 'react';

export const Panel = ({
  children,
  title,
  subtitle,
  actions,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  ...props
}) => {
  return (
    <div
      className={`bg-surface border border-line rounded-panel overflow-hidden ${className}`}
      {...props}
    >
      {(title || actions) && (
        <div
          className={`px-5 py-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${headerClassName}`}
        >
          <div>
            {title && (
              <h3 className="font-heading font-semibold text-base sm:text-lg text-ink">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-text-2 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default Panel;
