import React from 'react';
import { motion } from 'motion/react';

export const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  layoutId = 'ui-tabs-indicator',
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center p-1 bg-paper border border-line rounded-control gap-1 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-chip transition-colors duration-150 z-10 cursor-pointer ${
              isActive ? 'text-ink' : 'text-text-2 hover:text-ink'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="absolute inset-0 bg-surface rounded-chip shadow-xs border border-line -z-10"
              />
            )}
            <span className="flex items-center gap-1.5">
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isActive
                      ? 'bg-paper text-ink font-bold'
                      : 'bg-surface text-text-2'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const SegmentedControl = Tabs;

export default Tabs;
