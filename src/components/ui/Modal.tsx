/**
 * Modal / Drawer — full-screen on mobile, centered on desktop.
 * Touch-friendly; use for forms and confirmations.
 */
import React, { useEffect } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** If true, use drawer style (slide up) on mobile; default true */
  drawerOnMobile?: boolean;
  /** Max width on desktop (default max-w-lg) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const maxWidthMap = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
};

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  drawerOnMobile = true,
  maxWidth = 'lg',
  className = '',
}) => {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 safe-top safe-bottom"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel: full height on mobile (drawer), max height on desktop */}
      <div
        className={`
          relative w-full bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl
          max-h-[90vh] sm:max-h-[85vh] overflow-y-auto mobile-scroll
          ${drawerOnMobile ? 'min-h-[50vh] sm:min-h-0' : ''}
          ${maxWidthMap[maxWidth]} ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 bg-surface">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="touch-target min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:ring-2 focus:ring-primary"
              aria-label="Close"
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </div>
        )}
        <div className={title ? 'p-4 sm:p-6' : 'p-4 sm:p-6'}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
