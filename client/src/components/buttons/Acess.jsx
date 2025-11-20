import React from 'react';

const Acess = ({ 
  children, 
  onClick, 
  type = "button", 
  className = "",
  variant = "primary",
  disabled = false 
}) => {
  const baseClasses = "w-full py-3 px-4 sm:py-3.5 sm:px-6 rounded-xl font-semibold text-sm sm:text-base cursor-pointer transition-all duration-300";
  
  const variantClasses = {
    primary: "bg-[#1A99BA] text-white hover:bg-[#207880] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#207880]/30 active:translate-y-0",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline: "border-2 border-[#1A99BA] text-[#1A99BA] hover:bg-[#1A99BA] hover:text-white"
  };

  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
    >
      {children}
    </button>
  );
};

export default Acess;
