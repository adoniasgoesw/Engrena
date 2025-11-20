import React from 'react'
import { CheckCircle2 } from 'lucide-react'

const StatusButton = ({ onClick, isActive = true, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isActive 
          ? 'text-green-700 bg-green-50 hover:bg-green-100' 
          : 'text-gray-700 bg-gray-50 hover:bg-gray-100'
      } ${className}`}
      title={isActive ? 'Desativar' : 'Ativar'}
    >
      <CheckCircle2 className="w-4 h-4" />
    </button>
  )
}

export default StatusButton