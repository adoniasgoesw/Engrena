import React from 'react'
import { FileSpreadsheet } from 'lucide-react'

const PrintButton = ({ onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors ${className}`}
      title="Gerar PDF"
    >
      <FileSpreadsheet className="w-4 h-4" />
    </button>
  )
}

export default PrintButton


