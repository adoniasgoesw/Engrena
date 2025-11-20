import React from 'react'
import Sidebar from '../components/layout/Sidebar'
import ListUsuarios from '../components/lists/ListUsuarios'
import { useSidebar } from '../contexts/SidebarContext'

const Usuarios = () => {
  const { isCollapsed } = useSidebar();
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-hidden pb-6 md:pb-0 transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="h-full p-6 pb-2 md:pb-6 flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ListUsuarios />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Usuarios




