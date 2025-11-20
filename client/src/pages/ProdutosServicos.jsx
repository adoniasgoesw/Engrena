import React, { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import ListProdutos from '../components/lists/ListProdutos'
import ListServicos from '../components/lists/ListServicos'
import AddButton from '../components/buttons/AddButton'
import FormProduto from '../components/forms/FormProduto'
import FormServico from '../components/forms/FormServico'
import { useSidebar } from '../contexts/SidebarContext'

const ProdutosServicos = () => {
  const [activeTab, setActiveTab] = useState('produtos')
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-hidden pb-6 md:pb-0 transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="h-full p-6 pb-2 md:pb-6 flex flex-col">
          <div className="mb-4 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">Produtos e Serviços</h1>
              {activeTab === 'produtos' ? (
                <AddButton modalContent={<FormProduto />}>Novo Produto</AddButton>
              ) : (
                <AddButton modalContent={<FormServico />}>Novo Serviço</AddButton>
              )}
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 mt-4">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('produtos')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'produtos'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Produtos
                </button>
                <button
                  onClick={() => setActiveTab('servicos')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'servicos'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Serviços
                </button>
              </nav>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'produtos' ? <ListProdutos /> : <ListServicos />}
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProdutosServicos