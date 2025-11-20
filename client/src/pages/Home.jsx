import React, { useEffect, useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import ListOrdensServicos from '../components/lists/ListOrdensServicos'
import DashboardCharts from '../components/graphic/DashboardCharts'
import DashboardCard from '../components/cards/DashboardCard'
import PainelNotification from '../components/panel/PainelNotification'
import { FileText, Users, DollarSign, Bell } from 'lucide-react'
import { API_URL } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useSidebar } from '../contexts/SidebarContext'
import { getCachedData, setCachedData } from '../hooks/useCache'

const Home = () => {
  const [ordemTab, setOrdemTab] = useState('Pendente');
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
  const [pendingCount, setPendingCount] = useState(() => {
    if (estabelecimentoId) {
      return getCachedData(`dashboard_pending_${estabelecimentoId}`) || 0
    }
    return 0
  });
  const [inProgressCount, setInProgressCount] = useState(() => {
    if (estabelecimentoId) {
      return getCachedData(`dashboard_in_progress_${estabelecimentoId}`) || 0
    }
    return 0
  });
  const [activeClientsCount, setActiveClientsCount] = useState(() => {
    if (estabelecimentoId) {
      return getCachedData(`dashboard_active_clients_${estabelecimentoId}`) || 0
    }
    return 0
  });
  const [receitaMensal, setReceitaMensal] = useState(() => {
    if (estabelecimentoId) {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = hoje.getMonth() + 1;
      return getCachedData(`dashboard_receita_mensal_${estabelecimentoId}_${mes}_${ano}`) || 0
    }
    return 0
  });
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [notificacoesNaoLidasCount, setNotificacoesNaoLidasCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const estabelecimentoIdAtual = user?.estabelecimento_id || user?.estabelecimento?.id;
        if (!estabelecimentoIdAtual) return;
        
        // Carregar do cache primeiro
        const cachedPending = getCachedData(`dashboard_pending_${estabelecimentoIdAtual}`)
        const cachedInProgress = getCachedData(`dashboard_in_progress_${estabelecimentoIdAtual}`)
        if (cachedPending !== null) setPendingCount(cachedPending)
        if (cachedInProgress !== null) setInProgressCount(cachedInProgress)
        
        const resp = await fetch(`${API_URL}/api/auth/ordens?estabelecimento_id=${estabelecimentoIdAtual}`);
        const data = await resp.json();
        if (!resp.ok) return;
        const ordens = data.ordens || [];
        const normalize = (v) => (v || '').toString().trim();
        const pending = ordens.filter(o => normalize(o.status || o.situacao) === 'Pendente').length;
        const inProgress = ordens.filter(o => normalize(o.status || o.situacao) === 'Em Andamento').length;
        setPendingCount(pending);
        setInProgressCount(inProgress);
        setCachedData(`dashboard_pending_${estabelecimentoIdAtual}`, pending);
        setCachedData(`dashboard_in_progress_${estabelecimentoIdAtual}`, inProgress);
      } catch (e) {
        console.error('Erro ao carregar contadores de ordens:', e);
      }
    };

    fetchCounts();

    const handleRefresh = () => fetchCounts();
    window.addEventListener('addOrdem', handleRefresh);
    window.addEventListener('ordemCriada', handleRefresh);
    window.addEventListener('updateOrdem', handleRefresh);
    window.addEventListener('ordemAtualizada', handleRefresh);
    return () => {
      window.removeEventListener('addOrdem', handleRefresh);
      window.removeEventListener('ordemCriada', handleRefresh);
      window.removeEventListener('updateOrdem', handleRefresh);
      window.removeEventListener('ordemAtualizada', handleRefresh);
    };
  }, [user]);

  useEffect(() => {
    const fetchActiveClients = async () => {
      try {
        const estabelecimentoIdAtual = user?.estabelecimento_id || user?.estabelecimento?.id;
        if (!estabelecimentoIdAtual) return;
        
        // Carregar do cache primeiro
        const cachedActiveClients = getCachedData(`dashboard_active_clients_${estabelecimentoIdAtual}`)
        if (cachedActiveClients !== null) {
          setActiveClientsCount(cachedActiveClients)
        }
        
        const resp = await fetch(`${API_URL}/api/auth/clientes?estabelecimento_id=${estabelecimentoIdAtual}`);
        const data = await resp.json();
        if (!resp.ok) return;
        const clientes = data.clientes || data || [];
        const normalize = (v) => (v || '').toString().trim();
        const activeCount = clientes.filter(c => normalize(c.status) === 'Ativo').length;
        setActiveClientsCount(activeCount);
        setCachedData(`dashboard_active_clients_${estabelecimentoIdAtual}`, activeCount);
      } catch (e) {
        console.error('Erro ao carregar clientes ativos:', e);
      }
    };
    fetchActiveClients();
  }, [user]);

  // Buscar receita mensal (soma das receitas totais dos caixas fechados do mês atual)
  useEffect(() => {
    const fetchReceitaMensal = async () => {
      try {
        const estabelecimentoIdAtual = user?.estabelecimento_id || user?.estabelecimento?.id;
        if (!estabelecimentoIdAtual) return;
        
        // Calcular mês atual
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth() + 1;
        
        // Carregar do cache primeiro
        const cachedReceita = getCachedData(`dashboard_receita_mensal_${estabelecimentoIdAtual}_${mes}_${ano}`)
        if (cachedReceita !== null) {
          setReceitaMensal(cachedReceita)
        }
        
        const resp = await fetch(
          `${API_URL}/api/auth/caixas/receita-mensal?estabelecimento_id=${estabelecimentoIdAtual}&ano=${ano}&mes=${mes}`
        );
        const data = await resp.json();
        
        if (resp.ok) {
          const receita = parseFloat(data.receita_mensal || 0);
          setReceitaMensal(receita);
          setCachedData(`dashboard_receita_mensal_${estabelecimentoIdAtual}_${mes}_${ano}`, receita);
        }
      } catch (e) {
        console.error('Erro ao carregar receita mensal:', e);
      }
    };
    
    fetchReceitaMensal();
    
    // Atualizar quando caixa for fechado ou atualizado (receita pode mudar em tempo real)
    const handleCaixaFechado = () => fetchReceitaMensal();
    const handleCaixaAtualizado = () => fetchReceitaMensal();
    const handleParcelaAtualizada = () => fetchReceitaMensal();
    
    window.addEventListener('caixaFechado', handleCaixaFechado);
    window.addEventListener('caixaAtualizado', handleCaixaAtualizado);
    window.addEventListener('parcelaAtualizada', handleParcelaAtualizada);
    
    return () => {
      window.removeEventListener('caixaFechado', handleCaixaFechado);
      window.removeEventListener('caixaAtualizado', handleCaixaAtualizado);
      window.removeEventListener('parcelaAtualizada', handleParcelaAtualizada);
    };
  }, [user]);

  // Buscar contador de notificações não lidas
  useEffect(() => {
    const fetchNotificacoesNaoLidas = async () => {
      if (!user?.id) return;
      
      try {
        const resp = await fetch(`${API_URL}/api/auth/notificacoes?usuario_id=${user.id}`);
        const data = await resp.json();
        
        if (resp.ok) {
          const naoLidas = (data.notificacoes || []).filter(n => n.aberta).length;
          setNotificacoesNaoLidasCount(naoLidas);
        }
      } catch (e) {
        console.error('Erro ao buscar notificações:', e);
      }
    };

    fetchNotificacoesNaoLidas();
    
    // Atualizar quando evento for disparado
    const handleRefreshNotificacoes = () => fetchNotificacoesNaoLidas();
    window.addEventListener('notificacaoAtualizada', handleRefreshNotificacoes);
    window.addEventListener('novaNotificacao', handleRefreshNotificacoes);
    
    // Polling para atualizar o contador
    const intervalId = setInterval(() => {
      fetchNotificacoesNaoLidas();
    }, 3000);
    
    return () => {
      window.removeEventListener('notificacaoAtualizada', handleRefreshNotificacoes);
      window.removeEventListener('novaNotificacao', handleRefreshNotificacoes);
      clearInterval(intervalId);
    };
  }, [user?.id]);
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-y-auto pb-16 md:pb-0 transition-all duration-500 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <div className="p-6 pb-2 md:pb-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <button
                onClick={() => setIsNotificationPanelOpen(true)}
                className="relative p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-all duration-200 hover:scale-105 shadow-sm"
                title="Notificações"
              >
                <Bell className="w-5 h-5" />
                {notificacoesNaoLidasCount > 0 && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
            </div>

            {/* Painel de Notificações */}
            <PainelNotification 
              isOpen={isNotificationPanelOpen} 
              onClose={() => setIsNotificationPanelOpen(false)} 
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard title="Ordens Pendente" value={pendingCount.toString()} icon={FileText} />
              <DashboardCard title="Ordens em Andamento" value={inProgressCount.toString()} icon={FileText} />
              <DashboardCard 
                title="Receita Mensal" 
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receitaMensal)} 
                icon={DollarSign} 
              />
              <DashboardCard title="Clientes Ativos" value={activeClientsCount.toString()} icon={Users} />
            </div>

            {/* Lista de Ordens de Serviço */}
            <div className="h-[480px]">
              <ListOrdensServicos 
                hideHeader={true} 
                dashboardMode={true}
                topButton={(
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOrdemTab('Pendente')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border ${ordemTab === 'Pendente' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Pendentes
                    </button>
                    <button
                      onClick={() => setOrdemTab('Em Andamento')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border ${ordemTab === 'Em Andamento' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Em Andamento
                    </button>
                    <button
                      onClick={() => setOrdemTab('Aguardando Peças')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border ${ordemTab === 'Aguardando Peças' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Aguardando Peças
                    </button>
                    <button
                      onClick={() => setOrdemTab('Serviços Finalizados')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border ${ordemTab === 'Serviços Finalizados' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Serviços Finalizados
                    </button>
                    <button
                      onClick={() => setOrdemTab('Serviço Reaberto')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border ${ordemTab === 'Serviço Reaberto' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Serviços Reabertos
                    </button>
                    <button
                      onClick={() => setOrdemTab('Finalizado')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border ${ordemTab === 'Finalizado' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Finalizado
                    </button>
                  </div>
                )}
                filterStatus={ordemTab}
              />
            </div>

            {/* Gráficos */}
            <DashboardCharts />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home