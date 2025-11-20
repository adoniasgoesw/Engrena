import React from 'react';
import { X } from 'lucide-react';

const CancelButton = ({
  onClick,
  className = "",
  size = "sm",
  disabled = false,
  children = "Cancelar"
}) => {
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        font-medium text-gray-700 bg-white border border-gray-300 rounded-md
        hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200 hover:scale-105 active:scale-95
        ${className}
      `}
      title="Cancelar"
    >
      <div className="flex items-center justify-center space-x-2">
        <X className={iconSizes[size]} />
        <span>{children}</span>
      </div>
    </button>
  );
};

export default CancelButton;





