import React from 'react'
import { FileSpreadsheet } from 'lucide-react'

const ExportarExcelButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-6 py-2.5 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
    >
      <FileSpreadsheet className="w-4 h-4" />
      Exportar Excel
    </button>
  )
}

export default ExportarExcelButton








