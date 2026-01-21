import React, { useEffect, useRef } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable ConfirmationModal Component
 * 
 * Replaces window.confirm() with a professional, accessible modal.
 * 
 * Features:
 * - Keyboard accessible (ESC to cancel, Enter to confirm)
 * - Focus management (traps focus, returns focus on close)
 * - Consistent with theme (uses primary/accent/error colors)
 * - Mobile responsive
 * - Backdrop blur for modern look
 */
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  onConfirm,
  onCancel
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus the confirm button (or cancel if danger)
      setTimeout(() => {
        if (danger && cancelButtonRef.current) {
          cancelButtonRef.current.focus();
        } else if (confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        }
      }, 100);
    } else {
      // Return focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen, danger]);

  // Keyboard handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !danger) {
        // Only allow Enter to confirm if not a danger action
        if (document.activeElement === confirmButtonRef.current || 
            document.activeElement === cancelButtonRef.current) {
          onConfirm();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, danger, onConfirm, onCancel]);

  if (!isOpen) return null;

  const buttonVariant = danger ? 'danger' : 'primary';

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-description"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-gray-200 animate-fadeIn">
        <div className="p-6">
          {/* Icon */}
          <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
            danger ? 'bg-error/10' : 'bg-primary/10'
          }`}>
            {danger ? (
              <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Title */}
          <h3 
            id="confirmation-modal-title"
            className="text-xl font-bold text-gray-900 mb-2"
          >
            {title}
          </h3>

          {/* Description */}
          <p 
            id="confirmation-modal-description"
            className="text-sm text-gray-600 mb-6 whitespace-pre-line"
          >
            {description}
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              ref={cancelButtonRef}
              onClick={onCancel}
              className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                danger
                  ? 'bg-error text-white hover:bg-error/90 focus:ring-error'
                  : 'bg-primary text-white hover:bg-primary/90 focus:ring-primary'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
