import React from 'react'
import { FileSpreadsheet } from 'lucide-react'

const PDFButton = ({ onClick, className = "", title = "Gerar PDF", variant = "gray" }) => {
  const variantClasses = {
    gray: 'text-gray-700 bg-gray-50 hover:bg-gray-100',
    yellow: 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100',
    blue: 'text-blue-700 bg-blue-50 hover:bg-blue-100',
    green: 'text-green-700 bg-green-50 hover:bg-green-100'
  }

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors h-[32px] w-[32px] flex items-center justify-center ${variantClasses[variant]} ${className}`}
      title={title}
    >
      <FileSpreadsheet className="w-4 h-4" />
    </button>
  )
}

export default PDFButton

