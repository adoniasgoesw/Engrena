import React, { useState, useEffect } from 'react';
import ListBase from './ListBase';
import { API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../../contexts/ModalContext';
import AcceptButton from '../buttons/AcceptButton';
import { Info } from 'lucide-react';
import DetalhesOrdem from '../detalhes/DetalhesOrdem';

const ListOrdensServicos = ({ 
  hideHeader = false, 
  dashboardMode = false,
  hideCheckboxes = false,
  topButton = null,
  filterStatus = null
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openModal } = useModal();
  const [ordensData, setOrdensData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordensOriginais, setOrdensOriginais] = useState([]);

  // Função para transformar ordem da API para o formato esperado
  const transformOrdem = (ordem) => {
    const dataCriacao = ordem.criado_em ? new Date(ordem.criado_em) : null;
    return {
      id: ordem.id,
      cliente: ordem.cliente_nome || '--',
      veiculo: ordem.veiculo_placa || '--',
      status: ordem.status || ordem.situacao || 'Pendente',
      descricao: ordem.descricao || '--',
      codigo: ordem.codigo || '',
      previsao: ordem.previsao_saida 
        ? new Date(ordem.previsao_saida).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
        : '--',
      mecanico: ordem.responsavel_nome || ordem.mecanico_nome || ordem.mecanico || '--',
      data: ordem.data_abertura ? new Date(ordem.data_abertura).toLocaleDateString('pt-BR') : '--',
      data_criacao: dataCriacao ? dataCriacao.toLocaleDateString('pt-BR') : '--',
      data_criacao_hora: dataCriacao ? dataCriacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--',
      data_criacao_full: dataCriacao,
      total: ordem.total || 0,
      total_pago: ordem.total_pago || 0
    };
  };

  const normalizeStatus = (value) => (value || '').toString().trim();
  const dedupeById = (arr) => {
    const seen = new Set();
    const out = [];
    for (const item of arr || []) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        out.push(item);
      }
    }
    return out;
  };

  useEffect(() => {
    if (!user) return;

    const fetchOrdens = async () => {
      try {
        setLoading(true);
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
        
        if (!estabelecimentoId) {
          setLoading(false);
          return;
        }

        // Buscar ordens do banco de dados (sem filtro de situação no servidor)
        let url = `${API_URL}/api/auth/ordens?estabelecimento_id=${estabelecimentoId}`;

        const response = await fetch(url);
        
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          const text = await response.text();
          console.error('❌ Resposta não é JSON:', text);
          setLoading(false);
          return;
        }

        if (response.ok) {
          // Salvar ordens originais da API sem duplicadas; filtragem ocorrerá em outro efeito
          setOrdensOriginais(dedupeById(data.ordens || []));
        } else {
          console.error('Erro ao buscar ordens:', data.error);
        }
      } catch (error) {
        console.error('Erro ao buscar ordens de serviço:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrdens();
  }, [user, dashboardMode]);

  // Recalcular dados exibidos quando o filtro ou originais mudarem
  useEffect(() => {
    const transformed = dedupeById(ordensOriginais || []).map(transformOrdem);
    let filtered = transformed;
    
    if (filterStatus) {
      const normalizedFilter = normalizeStatus(filterStatus);
      filtered = transformed.filter(o => {
        const normalizedStatusValue = normalizeStatus(o.status);
        // Comparação case-insensitive e com trim
        return normalizedStatusValue === normalizedFilter;
      });
    } else if (!dashboardMode) {
      // Se não estiver no dashboard e não houver filtro, excluir ordens com status "Finalizado"
      filtered = transformed.filter(o => {
        const normalizedStatusValue = normalizeStatus(o.status);
        return normalizedStatusValue !== 'Finalizado';
      });
    }
    
    setOrdensData(filtered);
  }, [filterStatus, ordensOriginais, dashboardMode]);

  // Escutar eventos de atualização
  useEffect(() => {
    const handleAddOrdem = (event) => {
      const novaOrdem = event.detail.ordem || event.detail;
      // Adicionar nova ordem na lista - sem loading
      const ordemTransformada = transformOrdem(novaOrdem);
      const normalizedOrdemStatus = normalizeStatus(ordemTransformada.status);
      
      // Se não estiver no dashboard e a ordem for "Finalizado", não adicionar
      if (!dashboardMode && normalizedOrdemStatus === 'Finalizado') {
        return;
      }
      
      // Dashboard não força filtro; tabs controlam via filterStatus
      // Se houver filtro de status, só adicionar se corresponder
      if (filterStatus) {
        const normalizedFilter = normalizeStatus(filterStatus);
        if (normalizedOrdemStatus !== normalizedFilter) {
          return;
        }
      }
      
      setOrdensOriginais(prev => {
        const exists = prev.some(o => o.id === novaOrdem.id);
        if (exists) {
          return prev.map(o => o.id === novaOrdem.id ? novaOrdem : o);
        }
        return [novaOrdem, ...prev];
      });
    };

    const handleUpdateOrdem = (event) => {
      const ordemAtualizada = event.detail.ordem || event.detail;
      const ordemStatus = normalizeStatus(ordemAtualizada.status || ordemAtualizada.situacao || 'Pendente');
      
      // Atualizar ordem na lista - sem loading
      setOrdensOriginais(prev => {
        // Se não estiver no dashboard e a ordem ficou "Finalizado", remover da lista
        if (!dashboardMode && ordemStatus === 'Finalizado') {
          return prev.filter(o => o.id !== ordemAtualizada.id);
        }
        return prev.map(o => o.id === ordemAtualizada.id ? ordemAtualizada : o);
      });
      
      setOrdensData(prev => {
        const transformed = transformOrdem(ordemAtualizada);
        const mapped = prev.map(o => o.id === ordemAtualizada.id ? transformed : o);
        // Não forçar filtro de dashboard; aplicar somente filterStatus se houver
        let result = mapped;
        
        // Se não estiver no dashboard e não houver filtro, remover "Finalizado"
        if (!dashboardMode && !filterStatus) {
          result = result.filter(o => normalizeStatus(o.status) !== 'Finalizado');
        }
        // Aplicar filtro de status, se houver
        else if (filterStatus) {
          const normalizedFilter = normalizeStatus(filterStatus);
          result = result.filter(o => normalizeStatus(o.status) === normalizedFilter);
        }
        
        return result;
      });
    };

    window.addEventListener('addOrdem', handleAddOrdem);
    window.addEventListener('ordemCriada', handleAddOrdem);
    window.addEventListener('updateOrdem', handleUpdateOrdem);
    window.addEventListener('ordemAtualizada', handleUpdateOrdem);

    return () => {
      window.removeEventListener('addOrdem', handleAddOrdem);
      window.removeEventListener('ordemCriada', handleAddOrdem);
      window.removeEventListener('updateOrdem', handleUpdateOrdem);
      window.removeEventListener('ordemAtualizada', handleUpdateOrdem);
    };
  }, [dashboardMode, filterStatus]);

  // Formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  // Colunas padrão (para todos os status exceto "Finalizado")
  const defaultColumns = [
    { header: 'Cliente', key: 'cliente' },
    { header: 'Veículo', key: 'veiculo' },
    { header: 'Status', key: 'status', render: (row) => {
      const status = row.status || 'Pendente';
      const map = {
        'Pendente': 'bg-yellow-500 text-white',
        'Em Andamento': 'bg-blue-500 text-white',
        'Aprovada': 'bg-green-500 text-white',
        'Cancelada': 'bg-rose-600 text-white',
        'Recusada': 'bg-red-500 text-white',
        'Aguardando Peças': 'bg-orange-500 text-white',
        'Serviço Parado': 'bg-gray-500 text-white',
        'Em Supervisão': 'bg-indigo-500 text-white',
        'Serviços Finalizados': 'bg-emerald-600 text-white',
        'Finalizado': 'bg-green-700 text-white'
      };
      const bgColor = map[status] || 'bg-gray-300 text-gray-900';
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${bgColor}`}>
          {status}
        </span>
      );
    }},
    { header: 'Descrição', key: 'descricao' },
    { header: 'Previsão', key: 'previsao' },
    { header: 'Responsável', key: 'mecanico', render: (row) => {
      const showAccept = dashboardMode && (row.status || 'Pendente') === 'Pendente';
      return (
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[140px]">{row.mecanico}</span>
          {showAccept && (
            <AcceptButton
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const resp = await fetch(`${API_URL}/api/auth/ordens/${row.id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Em Andamento', responsavel_id: (user?.id || user?.usuario?.id) })
                  });
                  const data = await resp.json();
                  if (resp.ok) {
                    const updated = data.ordem;
                    window.dispatchEvent(new CustomEvent('ordemAtualizada', { detail: updated }));
                  } else {
                    console.error('Erro ao aceitar ordem:', data?.error || 'Erro desconhecido');
                  }
                } catch (err) {
                  console.error('Erro na requisição de aceitar ordem:', err);
                }
              }}
            />
          )}
        </div>
      );
    } }
  ];

  // Colunas para status "Finalizado"
  const finalizadoColumns = [
    { 
      header: 'Data', 
      key: 'data_criacao', 
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-gray-900">{row.data_criacao}</span>
          <span className="text-xs text-gray-500">{row.data_criacao_hora}</span>
        </div>
      )
    },
    { header: 'Cliente', key: 'cliente' },
    { header: 'Veículo', key: 'veiculo' },
    { header: 'Responsável', key: 'mecanico' },
    { header: 'Total', key: 'total', render: (row) => (
      <span className="font-semibold text-gray-900">{formatCurrency(row.total)}</span>
    )},
    { 
      header: 'Detalhes', 
      key: 'details', 
      width: '80px',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openModal(<DetalhesOrdem ordemId={row.id} />, { hideButtons: true });
          }}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors duration-200"
          title="Ver detalhes"
        >
          <Info className="w-4 h-4" />
        </button>
      )
    }
  ];

  // Usar colunas apropriadas baseado no filtro
  const columns = filterStatus === 'Finalizado' ? finalizadoColumns : defaultColumns;

  // Se estiver no dashboard e tiver topButton, configurar botão "Ver Todos"
  // No dashboard, não exibir título padrão; usar topButton somente se fornecido
  const configuredTopButton = topButton || null;

  // Função para navegar para detalhes da ordem
  const handleRowClick = (ordem) => {
    const status = ordem?.status || 'Pendente';
    if (status === 'Pendente') return; // Não abre detalhes para pendentes
    if (status === 'Finalizado') return; // Não abre detalhes ao clicar na linha (tem botão Details)
    navigate(`/ordem-servicos/${ordem.id}`);
  };

  // Função para obter mensagem apropriada baseada no status
  const getEmptyMessage = () => {
    if (!filterStatus) return "Nenhuma ordem de serviço encontrada";
    
    const statusMessages = {
      'Pendente': 'Nenhuma ordem pendente encontrada',
      'Em Andamento': 'Nenhuma ordem em andamento encontrada',
      'Aguardando Peças': 'Nenhuma ordem aguardando peças encontrada',
      'Serviços Finalizados': 'Nenhuma ordem de serviço finalizado encontrada',
      'Serviço Reaberto': 'Nenhuma ordem reaberta encontrada',
      'Finalizado': 'Nenhuma ordem finalizada encontrada'
    };
    
    return statusMessages[filterStatus] || "Nenhuma ordem de serviço encontrada";
  };

  return (
    <ListBase
      columns={columns}
      data={ordensData}
      loading={loading}
      hideCheckboxes={true}
      hideHeader={hideHeader}
      topButton={configuredTopButton}
      emptyMessage={getEmptyMessage()}
      headerMarginTop={true}
      onRowClick={handleRowClick}
    />
  );
};

export default ListOrdensServicos;
