import React from 'react'

const ConfirmButton = ({ onClick, className = "", children = "Let's Go!", disabled = false, isLoading = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`w-full bg-gradient-to-r from-white to-gray-100 text-black font-semibold py-4 px-12 rounded-2xl shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all duration-300 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? 'Carregando...' : children}
    </button>
  )
}

export default ConfirmButton

































