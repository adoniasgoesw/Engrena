import React from 'react';
import { X } from 'lucide-react';

const CloseButton = ({ onClick, variant = "default", className = "" }) => {
  const baseClasses = "p-4 rounded-lg transition-colors duration-200 flex items-center justify-center";
  
  const variantClasses = {
    default: "text-slate-900 hover:bg-slate-100 hover:text-slate-700",
    destructive: "text-red-500 hover:bg-red-100 hover:text-red-700"
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      <X className="h-4 w-4" />
    </button>
  );
};

export default CloseButton;
