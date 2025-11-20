import React from 'react'
import { XCircle } from 'lucide-react'

const RejectButton = ({ onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors ${className}`}
      title="Recusar"
    >
      <XCircle className="w-4 h-4" />
    </button>
  )
}

export default RejectButton
