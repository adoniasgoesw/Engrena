import React from 'react'
import { Receipt } from 'lucide-react'

const ReciboButton = ({ onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors ${className}`}
      title="Gerar Recibo"
    >
      <Receipt className="w-4 h-4" />
    </button>
  )
}

export default ReciboButton



