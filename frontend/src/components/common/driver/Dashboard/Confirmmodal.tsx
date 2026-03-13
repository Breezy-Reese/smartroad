import React, { useEffect, useRef } from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type ModalType = 'warning' | 'info' | 'success' | 'danger';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
  loading?: boolean;
}

const typeConfig: Record<ModalType, {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  iconBg: string;
  iconColor: string;
  confirmBtn: string;
}> = {
  warning: {
    icon: ExclamationTriangleIcon,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 focus-visible:ring-yellow-500',
  },
  danger: {
    icon: XCircleIcon,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBtn: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
  },
  info: {
    icon: InformationCircleIcon,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
  },
  success: {
    icon: CheckCircleIcon,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    confirmBtn: 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500',
  },
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const config = typeConfig[type];
  const Icon = config.icon;

  // Focus confirm button when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">

        {/* Close X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close modal"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${config.iconBg}`}>
          <Icon className={`h-7 w-7 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <h2 id="modal-title" className="text-lg font-bold text-gray-900 text-center mb-2">
          {title}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
          {message}
        </p>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            disabled={loading}
            className={`
              flex-1 py-2.5 px-4 rounded-xl text-white font-semibold text-sm
              transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              disabled:opacity-50 disabled:cursor-wait
              ${config.confirmBtn}
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
                </svg>
                Processing…
              </span>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
