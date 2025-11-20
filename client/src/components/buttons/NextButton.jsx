import React from 'react'

const NextButton = ({ onClick, className = "", children = "Next", disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 bg-gray-800 text-white font-semibold py-2 px-4 sm:py-3 rounded-xl hover:bg-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  )
}

export default NextButton

































