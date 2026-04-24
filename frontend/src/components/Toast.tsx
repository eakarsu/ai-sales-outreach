import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const typeConfig: Record<ToastType, { color: string; bg: string; border: string; Icon: React.FC<any> }> = {
  success: { color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0', Icon: CheckCircle },
  error: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca', Icon: XCircle },
  warning: { color: '#92400e', bg: '#fffbeb', border: '#fde68a', Icon: AlertTriangle },
  info: { color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', Icon: Info },
};

const TOAST_DURATION = 4000;

const ToastItem: React.FC<{ toast: Toast; onClose: (id: string) => void }> = ({ toast, onClose }) => {
  const config = typeConfig[toast.type];
  const IconComponent = config.Icon;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '8px',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        minWidth: '320px',
        maxWidth: '420px',
        animation: toast.exiting ? 'toastSlideOut 0.3s ease-in forwards' : 'toastSlideIn 0.3s ease-out forwards',
        pointerEvents: 'auto',
      }}
    >
      <IconComponent size={20} style={{ flexShrink: 0, marginTop: '1px' }} />
      <span style={{ flex: 1, fontSize: '14px', lineHeight: '1.5' }}>{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: config.color,
          opacity: 0.7,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

      const timer = setTimeout(() => {
        removeToast(id);
      }, TOAST_DURATION);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
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

export default ToastProvider;
