import React from 'react'
import { FileSpreadsheet } from 'lucide-react'

const ExcelButton = ({ onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 transition-colors ${className}`}
      title="Exportar Excel"
    >
      <FileSpreadsheet className="w-4 h-4" />
    </button>
  )
}

export default ExcelButton



