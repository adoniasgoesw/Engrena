import React from 'react'
import Sidebar from '../components/layout/Sidebar'
import ListCategory from '../components/lists/ListCategory'
import AddButton from '../components/buttons/AddButton'
import FormCategory from '../components/forms/FormCategory'
import { useSidebar } from '../contexts/SidebarContext'

const Categorias = () => {
  const { isCollapsed } = useSidebar();
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-hidden pb-6 md:pb-0 transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="h-full p-6 pb-2 md:pb-6 flex flex-col">
          <div className="mb-4 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
              <AddButton modalContent={<FormCategory />}>Nova Categoria</AddButton>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ListCategory />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Categorias