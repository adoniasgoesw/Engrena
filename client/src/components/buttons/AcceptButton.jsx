import React from 'react'
import { CheckCircle2 } from 'lucide-react'

const AcceptButton = ({ onClick, className = "" }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 transition-colors ${className}`}
      title="Aceitar"
    >
      <CheckCircle2 className="w-4 h-4" />
    </button>
  )
}

export default AcceptButton


