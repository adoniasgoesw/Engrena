import React from 'react'
import { FileDown } from 'lucide-react'

const ExportarPDFButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-6 py-2.5 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
    >
      <FileDown className="w-4 h-4" />
      Exportar PDF
    </button>
  )
}

export default ExportarPDFButton








