import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  full: 'max-w-full mx-4',
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClasses[size]} bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-ink-100 flex-shrink-0">
            <h2 className="font-display tracking-wide text-xl text-ink-900">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 transition-colors">
              <X size={20} className="text-ink-500" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', variant = 'danger', loading = false
}) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <p className="text-ink-600 text-base mb-6">{message}</p>
    <div className="flex gap-3">
      <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`flex-1 ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
      >
        {loading ? 'Processing...' : confirmLabel}
      </button>
    </div>
  </Modal>
);
