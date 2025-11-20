import React from 'react';

const CancelButton = ({ children, onClick, disabled = false, className = "" }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 border border-slate-900 text-slate-900 bg-white hover:bg-gray-50 rounded-lg transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

export default CancelButton;
