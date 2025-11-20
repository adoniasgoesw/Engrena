import React from 'react';

const LoadingButton = ({ 
  children, 
  onClick, 
  type = "button", 
  className = "",
  variant = "primary",
  disabled = false,
  loading = false
}) => {
  const baseClasses = "w-full py-3 px-4 sm:py-3.5 sm:px-6 rounded-xl font-semibold text-sm sm:text-base cursor-pointer transition-all duration-300 flex items-center justify-center";
  
  const variantClasses = {
    primary: "bg-[#1A99BA] text-white hover:bg-[#207880] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1A99BA]/30 active:translate-y-0",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300",
    outline: "border-2 border-[#1A99BA] text-[#1A99BA] hover:bg-[#1A99BA] hover:text-white"
  };

  const disabledClasses = disabled || loading ? "opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default LoadingButton;






