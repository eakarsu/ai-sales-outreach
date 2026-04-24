import React, { useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

type DialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: DialogVariant;
}

const variantConfig: Record<DialogVariant, { color: string; bg: string; buttonBg: string; buttonHover: string; Icon: React.FC<any> }> = {
  danger: {
    color: '#dc2626',
    bg: '#fef2f2',
    buttonBg: '#dc2626',
    buttonHover: '#b91c1c',
    Icon: AlertTriangle,
  },
  warning: {
    color: '#d97706',
    bg: '#fffbeb',
    buttonBg: '#d97706',
    buttonHover: '#b45309',
    Icon: AlertTriangle,
  },
  info: {
    color: '#2563eb',
    bg: '#eff6ff',
    buttonBg: '#2563eb',
    buttonHover: '#1d4ed8',
    Icon: Info,
  },
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const config = variantConfig[variant];
  const IconComponent = config.Icon;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'confirmFadeIn 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes confirmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes confirmScaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        ref={dialogRef}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '28px',
          maxWidth: '440px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          animation: 'confirmScaleIn 0.2s ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: config.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconComponent size={24} color={config.color} />
          </div>
        </div>
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
            textAlign: 'center',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.5',
            textAlign: 'center',
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              flex: 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: config.buttonBg,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              flex: 1,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export { ConfirmDialog };
export default ConfirmDialog;
