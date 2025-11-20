import React from 'react'

const DetailPanel = ({ title = 'Detalhes Panel', header = null, children, className = '' }) => {
  return (
    <div className={`bg-white shadow-md rounded-xl w-full min-h-full p-6 m-2 ${className}`}>
      <div className="mb-4 flex-shrink-0">
        {header ? (
          header
        ) : (
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        )}
      </div>
      <div className="w-full flex flex-col">
        {children}
      </div>
    </div>
  )
}

export default DetailPanel


