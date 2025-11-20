import React from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import DashboardCard from '../components/cards/DashboardCard'
import { useSidebar } from '../contexts/SidebarContext'
import { 
  Users, 
  Car, 
  Tag, 
  Box,
  Wrench,
  FileText,
  History,
  BarChart3,
  Warehouse,
  DollarSign
} from 'lucide-react'

// Componente para ícone de Produtos e Serviços
const ProdutosServicosIcon = ({ className = "h-5 w-5 text-[#207880]" }) => (
  <div className={`relative ${className}`}>
    <Box className="w-full h-full" />
    <Wrench className="w-3/4 h-3/4 absolute -bottom-1 -right-1" />
  </div>
);

const Ajustes = () => {
  const navigate = useNavigate()
  const { isCollapsed } = useSidebar();

  const gestaoItems = [
    { title: "Clientes", url: "/cliente", icon: Users },
    { title: "Veículos", url: "/veiculos", icon: Car },
    { title: "Categorias", url: "/categorias", icon: Tag },
    { title: "Produtos e Serviços", url: "/produtos-servicos", icon: ProdutosServicosIcon },
    { title: "Ordens", url: "/ordem-servicos", icon: FileText },
  ]

  const administrativoItems = [
    { title: "Histórico", url: "/historico", icon: History },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
    { title: "Estoque", url: "/estoque", icon: Warehouse },
    { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  ]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-hidden pb-6 md:pb-0 transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="p-6 pb-2 md:pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Ajustes</h1>
          
          {/* Seção Gestão */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Gestão</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {gestaoItems.map((item) => (
                <div
                  key={item.title}
                  onClick={() => navigate(item.url)}
                  className="cursor-pointer"
                >
                  <DashboardCard
                    title={item.title}
                    value=""
                    icon={item.icon}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Seção Administrativo */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Administrativo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {administrativoItems.map((item) => (
                <div
                  key={item.title}
                  onClick={() => navigate(item.url)}
                  className="cursor-pointer"
                >
                  <DashboardCard
                    title={item.title}
                    value=""
                    icon={item.icon}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Ajustes
