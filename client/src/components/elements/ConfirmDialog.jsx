import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Ação",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning", // warning, danger, info
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-red-500',
          iconBg: 'bg-red-50',
          border: 'border-gray-200'
        };
      case 'warning':
        return {
          icon: 'text-orange-500',
          iconBg: 'bg-orange-50',
          border: 'border-gray-200'
        };
      case 'info':
        return {
          icon: 'text-blue-500',
          iconBg: 'bg-blue-50',
          border: 'border-gray-200'
        };
      default:
        return {
          icon: 'text-orange-500',
          iconBg: 'bg-orange-50',
          border: 'border-gray-200'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - removido fundo preto */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className={`
        relative bg-white rounded-lg shadow-xl border-2 ${styles.border}
        w-full max-w-md mx-4 transform transition-all duration-300
        scale-100 opacity-100
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${styles.iconBg}`}>
              <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors
              ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
            `}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processando...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
