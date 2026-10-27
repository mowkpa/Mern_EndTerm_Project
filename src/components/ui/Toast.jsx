import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000, action = null) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type, action }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const icons = {
              success: <CheckCircle2 className="w-4 h-4 text-free shrink-0 mt-0.5" />,
              error: <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />,
              info: <Info className="w-4 h-4 text-mine shrink-0 mt-0.5" />,
            };

            const borderColors = {
              success: 'border-free/30 bg-surface',
              error: 'border-danger/30 bg-surface',
              info: 'border-line bg-surface',
            };

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-floating border shadow-floating ${
                  borderColors[toast.type] || borderColors.info
                }`}
              >
                {icons[toast.type] || icons.info}
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-ink leading-snug">
                    {toast.message}
                  </p>
                  {toast.action && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.action.onClick?.();
                        removeToast(toast.id);
                      }}
                      className="mt-2 text-xs font-semibold text-mine hover:underline cursor-pointer"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss toast"
                  className="w-5 h-5 rounded-chip text-text-2 hover:text-ink hover:bg-paper flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default { ToastProvider, useToast };
