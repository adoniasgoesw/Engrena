import React from 'react'
import { useParams } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import OrdemDetailPanel from '../components/panel/OrdemDetailPanel'
import { useSidebar } from '../contexts/SidebarContext'

const DetalhesOrdem = () => {
  const { id } = useParams()
  const { isCollapsed } = useSidebar();
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-y-auto md:pb-0 transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="min-h-full pl-2 pr-6 py-2 flex flex-col">
          <OrdemDetailPanel ordemId={id} />
        </div>
      </main>
    </div>
  )
}

export default DetalhesOrdem



