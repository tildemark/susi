'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const styles = {
            success: 'bg-emerald-50 border-emerald-250 text-emerald-800',
            error: 'bg-rose-50 border-rose-250 text-rose-800',
            warning: 'bg-amber-50 border-amber-250 text-amber-800',
            info: 'bg-indigo-50 border-indigo-250 text-indigo-800',
          }[t.type];

          const Icon = {
            success: CheckCircle,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info,
          }[t.type];

          return (
            <div
              key={t.id}
              className={`p-4 border rounded-xl shadow-lg flex items-start gap-3 transition-all duration-300 animate-slide-in pointer-events-auto ${styles}`}
            >
              <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm font-semibold pr-2 leading-relaxed">
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-lg hover:bg-slate-100/50 mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
