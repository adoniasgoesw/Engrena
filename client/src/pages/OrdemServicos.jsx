import React from 'react'
import Sidebar from '../components/layout/Sidebar'
import ListOrdensServicos from '../components/lists/ListOrdensServicos'
import AddButton from '../components/buttons/AddButton'
import FormOrdemServico from '../components/forms/FormOrdemServico'
import { useSidebar } from '../contexts/SidebarContext'

const OrdemServicos = () => {
  const { isCollapsed } = useSidebar();
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-hidden pb-6 md:pb-0 transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="h-full p-6 pb-2 md:pb-6 flex flex-col">
          <div className="mb-4 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">Ordens de Serviço</h1>
              <AddButton modalContent={<FormOrdemServico />}>Nova Ordem</AddButton>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ListOrdensServicos />
          </div>
        </div>
      </main>
    </div>
  )
}

export default OrdemServicos