import React from 'react'
import Sidebar from '../components/layout/Sidebar'
import { useSidebar } from '../contexts/SidebarContext'
import ListOrdensServicos from '../components/lists/ListOrdensServicos'

const Historico = () => {
  const { isCollapsed } = useSidebar();
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="p-6 flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Histórico</h1>
        </div>
        <div className="flex-1 overflow-hidden px-6 pb-6">
          <ListOrdensServicos 
            hideHeader={true}
            filterStatus="Finalizado"
          />
        </div>
      </main>
    </div>
  )
}

export default Historico
