import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  Users, 
  Car, 
  Tag, 
  Package, 
  Wrench, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Box,
  BarChart3,
  DollarSign,
  Warehouse,
  Wallet,
  ChevronDown,
  ChevronUp,
  Building2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useSidebar } from '../../contexts/SidebarContext.jsx';
import { API_URL } from '../../services/api';
import LogoutButton from '../buttons/LogoutButton';

// Componente para ícone de Produtos e Serviços
const ProdutosServicosIcon = ({ className }) => (
  <div className={`relative ${className}`}>
    <Box className="w-4 h-4" />
    <Wrench className="w-3 h-3 absolute -bottom-1 -right-1" />
  </div>
);

const Sidebar = () => {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { logout, user } = useAuth();
  const location = useLocation();
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [financeiroExpanded, setFinanceiroExpanded] = useState(false);

  // Buscar contador de notificações não lidas
  useEffect(() => {
    const fetchNotificacoesNaoLidas = async () => {
      if (!user?.id) return;
      
      try {
        const resp = await fetch(`${API_URL}/api/auth/notificacoes?usuario_id=${user.id}`);
        const data = await resp.json();
        
        if (resp.ok) {
          const naoLidas = (data.notificacoes || []).filter(n => n.aberta).length;
          setNotificacoesNaoLidas(naoLidas);
        }
      } catch (e) {
        console.error('Erro ao buscar notificações:', e);
      }
    };

    fetchNotificacoesNaoLidas();
    
    // Escutar eventos de atualização
    const handleRefresh = () => fetchNotificacoesNaoLidas();
    window.addEventListener('notificacaoAtualizada', handleRefresh);
    window.addEventListener('novaNotificacao', handleRefresh);
    
    // Polling para atualizar o contador
    const intervalId = setInterval(() => {
      fetchNotificacoesNaoLidas();
    }, 3000); // Verificar a cada 3 segundos
    
    return () => {
      window.removeEventListener('notificacaoAtualizada', handleRefresh);
      window.removeEventListener('novaNotificacao', handleRefresh);
      clearInterval(intervalId);
    };
  }, [user]);

  const menuItems = [
    { title: "Dashboard", url: "/home", icon: LayoutDashboard },
    { title: "Clientes", url: "/cliente", icon: Users },
    { title: "Usuários", url: "/usuarios", icon: Users },
    { title: "Veículos", url: "/veiculos", icon: Car },
    { title: "Categorias", url: "/categorias", icon: Tag },
    { title: "Produtos e Serviços", url: "/produtos-servicos", icon: ProdutosServicosIcon },
    { title: "Ordem de Serviços", url: "/ordem-servicos", icon: FileText },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
    { title: "Estoque", url: "/estoque", icon: Warehouse },
    { title: "Ajustes", url: "/ajustes", icon: Settings },
  ];

  // Verificar se está em uma rota financeira para expandir
  useEffect(() => {
    if (location.pathname === '/financeiro' || location.pathname === '/carteira') {
      setFinanceiroExpanded(true);
    }
  }, [location.pathname]);

  // Itens do footer mobile (apenas os principais)
  const mobileFooterItems = [
    { title: "Dashboard", url: "/home", icon: LayoutDashboard },
    { title: "Ordem", url: "/ordem-servicos", icon: FileText },
    { title: "Ajustes", url: "/ajustes", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <>
      {/* Sidebar Desktop */}
      <div className={`hidden md:flex ${isCollapsed ? 'w-16' : 'w-64'} bg-slate-900 h-screen fixed left-0 top-0 flex-col transition-all duration-500 ease-in-out shadow-lg z-50`}>
        {/* Header */}
        <div className="border-b border-slate-700 py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-slate-300" />
              </div>
              {!isCollapsed && (
                <span className="text-lg font-bold text-slate-100 transition-opacity duration-500 ease-in-out">
                  Engrena
                </span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors duration-200"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-slate-300" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-slate-300" />
              )}
            </button>
          </div>
        </div>

        {/* Menu Principal */}
        <div className="flex-1 py-4">
          <div className="px-2">
            <div className={`text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3 transition-opacity duration-500 ease-in-out ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
              {!isCollapsed && "Menu Principal"}
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end={item.url === "/home"}
                  className={({ isActive }) =>
                    `flex items-center ${isCollapsed ? 'gap-0 justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-all duration-500 ease-in-out group relative ${
                      isActive
                        ? 'bg-slate-800 text-slate-100 font-medium'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                    }`
                  }
                >
                  <div className="relative flex-shrink-0">
                    <item.icon className="h-5 w-5" />
                    {/* Badge de notificações apenas no Dashboard */}
                    {item.title === "Dashboard" && notificacoesNaoLidas > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-slate-900">
                        {notificacoesNaoLidas > 9 ? '9+' : notificacoesNaoLidas}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="flex-1 text-sm transition-opacity duration-500 ease-in-out">{item.title}</span>
                  )}
                  
                  {/* Tooltip para modo colapsado */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-slate-800 text-slate-100 text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                      {item.title}
                      {item.title === "Dashboard" && notificacoesNaoLidas > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                          {notificacoesNaoLidas}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              ))}
              
              {/* Menu Financeiro com Submenu */}
              {!isCollapsed ? (
                <div className="space-y-1">
                  <button
                    onClick={() => setFinanceiroExpanded(!financeiroExpanded)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-500 ease-in-out group relative ${
                      location.pathname === '/financeiro' || location.pathname === '/carteira'
                        ? 'bg-slate-800 text-slate-100 font-medium'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                    }`}
                  >
                    <DollarSign className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 text-sm text-left">Financeiro</span>
                    {financeiroExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {financeiroExpanded && (
                    <div className="ml-4 space-y-1">
                      <NavLink
                        to="/financeiro"
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-slate-700 text-slate-100 font-medium'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                          }`
                        }
                      >
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm">Caixa</span>
                      </NavLink>
                      <NavLink
                        to="/carteira"
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-slate-700 text-slate-100 font-medium'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                          }`
                        }
                      >
                        <Wallet className="h-4 w-4" />
                        <span className="text-sm">Carteira</span>
                      </NavLink>
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  to="/financeiro"
                  className={({ isActive }) =>
                    `flex items-center gap-0 justify-center px-3 py-2.5 rounded-lg transition-all duration-500 ease-in-out group relative ${
                      isActive
                        ? 'bg-slate-800 text-slate-100 font-medium'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                    }`
                  }
                >
                  <DollarSign className="h-5 w-5" />
                  <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-slate-800 text-slate-100 text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
                    Financeiro
                  </div>
                </NavLink>
              )}
            </nav>
          </div>
        </div>

        {/* Footer com Logout */}
        <div className="border-t border-slate-700 py-4 px-2">
          <LogoutButton onClick={handleLogout} />
        </div>
      </div>

      {/* Footer Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50 shadow-lg">
        <div className="flex items-center justify-around px-2 py-3">
          {mobileFooterItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/home"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 flex-1 relative ${
                  isActive
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                }`
              }
            >
              <div className="relative">
              <item.icon className="h-5 w-5 flex-shrink-0" />
                {/* Badge de notificações apenas no Dashboard (mobile) */}
                {item.title === "Dashboard" && notificacoesNaoLidas > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-slate-900">
                    {notificacoesNaoLidas > 9 ? '9+' : notificacoesNaoLidas}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{item.title}</span>
            </NavLink>
          ))}
        </div>
      </div>

    </>
  );
};

export default Sidebar;