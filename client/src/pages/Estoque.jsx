import React from 'react'
import Sidebar from '../components/layout/Sidebar'
import { useSidebar } from '../contexts/SidebarContext'

const Estoque = () => {
  const { isCollapsed } = useSidebar();
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-hidden pb-6 md:pb-0 transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="p-6 pb-2 md:pb-6">
          <h1 className="text-3xl font-bold text-gray-900">Estoque</h1>
          <p className="text-gray-600 mt-2">Página em desenvolvimento</p>
        </div>
      </main>
    </div>
  )
}

export default Estoque





