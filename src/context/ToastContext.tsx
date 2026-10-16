import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts(prev => [newToast, ...prev].slice(0, 5)); // Keep max 5 visible toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string, duration?: number) => {
      addToast('success', message, title, duration);
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) => {
      addToast('error', message, title, duration ?? 5000);
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) => {
      addToast('warning', message, title, duration);
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) => {
      addToast('info', message, title, duration);
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info
      }}
    >
      {children}

      {/* Floating Toasts Viewport */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map(toast => {
          const typeConfig = {
            success: {
              icon: CheckCircle2,
              iconColor: 'text-emerald-500 dark:text-emerald-400',
              borderColor: 'border-emerald-200 dark:border-emerald-800/80',
              bgColor: 'bg-white dark:bg-slate-900',
              badgeColor: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
            },
            error: {
              icon: AlertCircle,
              iconColor: 'text-rose-500 dark:text-rose-400',
              borderColor: 'border-rose-200 dark:border-rose-800/80',
              bgColor: 'bg-white dark:bg-slate-900',
              badgeColor: 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
            },
            warning: {
              icon: AlertTriangle,
              iconColor: 'text-amber-500 dark:text-amber-400',
              borderColor: 'border-amber-200 dark:border-amber-800/80',
              bgColor: 'bg-white dark:bg-slate-900',
              badgeColor: 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
            },
            info: {
              icon: Info,
              iconColor: 'text-sky-500 dark:text-sky-400',
              borderColor: 'border-sky-200 dark:border-sky-800/80',
              bgColor: 'bg-white dark:bg-slate-900',
              badgeColor: 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300'
            }
          }[toast.type];

          const IconComponent = typeConfig.icon;

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border ${typeConfig.borderColor} ${typeConfig.bgColor} shadow-lg shadow-slate-900/10 dark:shadow-black/40 transition-all animate-in slide-in-from-top-3 fade-in duration-200`}
            >
              <div className="shrink-0 mt-0.5">
                <IconComponent className={`w-5 h-5 ${typeConfig.iconColor}`} />
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                {toast.title && (
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Fechar notificação"
                aria-label="Fechar notificação"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
