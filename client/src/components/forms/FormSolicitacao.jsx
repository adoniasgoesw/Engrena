import React, { useState, useEffect } from 'react';
import { API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const FormSolicitacao = ({ ordemId, solicitacao = null, onSave = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    solicitante_id: user?.id || '',
    destinatario_id: '',
    assunto: '',
    tipo: '',
    descricao: '',
    prioridade: 'Média'
  });

  const [errors, setErrors] = useState({});
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);

  // Preencher solicitante automaticamente
  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({
        ...prev,
        solicitante_id: user.id
      }));
    }
  }, [user]);

  // Atualizar formData quando solicitacao mudar (para edição)
  useEffect(() => {
    if (solicitacao) {
      setFormData({
        solicitante_id: solicitacao.solicitante_id || user?.id || '',
        destinatario_id: solicitacao.destinatario_id || '',
        assunto: solicitacao.assunto || '',
        tipo: solicitacao.tipo || '',
        descricao: solicitacao.descricao || '',
        prioridade: solicitacao.prioridade || 'Média'
      });
    }
  }, [solicitacao, user]);

  // Carregar usuários do estabelecimento
  useEffect(() => {
    const fetchUsuarios = async () => {
      if (!user) return;
      
      const estabelecimentoId = user.estabelecimento_id || user.estabelecimento?.id;
      if (!estabelecimentoId) return;

      try {
        setLoadingUsuarios(true);
        const response = await fetch(`${API_URL}/api/auth/usuarios?estabelecimento_id=${estabelecimentoId}`);
        const data = await response.json();

        if (response.ok) {
          setUsuarios(data.usuarios || data || []);
        }
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      } finally {
        setLoadingUsuarios(false);
      }
    };

    fetchUsuarios();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validações
    if (!formData.destinatario_id) {
      setErrors({ destinatario_id: 'Destinatário é obrigatório' });
      return;
    }

    if (!formData.assunto.trim()) {
      setErrors({ assunto: 'Assunto é obrigatório' });
      return;
    }

    if (!formData.tipo) {
      setErrors({ tipo: 'Tipo de solicitação é obrigatório' });
      return;
    }

    if (!formData.descricao.trim()) {
      setErrors({ descricao: 'Descrição é obrigatória' });
      return;
    }

    try {
      const dataToSend = {
        ordem_servico_id: parseInt(ordemId),
        solicitante_id: parseInt(formData.solicitante_id),
        destinatario_id: parseInt(formData.destinatario_id),
        assunto: formData.assunto.trim(),
        tipo: formData.tipo,
        descricao: formData.descricao.trim(),
        prioridade: formData.prioridade,
        status: solicitacao?.status || 'Pendente'
      };

      const url = solicitacao 
        ? `${API_URL}/api/auth/ordens/${ordemId}/solicitacoes/${solicitacao.id}` 
        : `${API_URL}/api/auth/ordens/${ordemId}/solicitacoes`;
      const method = solicitacao ? 'PUT' : 'POST';

      console.log(`📤 Enviando dados para ${method} ${url}:`, dataToSend);

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (response.ok) {
        const solicitacaoSalva = data.solicitacao || data;
        console.log(`✅ Solicitação ${solicitacao ? 'atualizada' : 'criada'} com sucesso!`, solicitacaoSalva);
        
        // Se a ordem foi atualizada (ex: status mudou para "Aguardando peça")
        if (data.ordem) {
          // Disparar evento para atualizar a ordem no header
          window.dispatchEvent(new CustomEvent('ordemAtualizada', { 
            detail: data.ordem 
          }));
          console.log('✅ Ordem atualizada automaticamente:', data.ordem);
        }
        
        // Se há callback onSave, chamar
        if (onSave) {
          onSave(solicitacaoSalva);
        }
        
        // Disparar evento para fechar modal
        window.dispatchEvent(new CustomEvent('modalSaveSuccess', {
          detail: { solicitacao: solicitacaoSalva }
        }));

        // Disparar evento para atualizar lista
        window.dispatchEvent(new CustomEvent('refreshSolicitacoes'));
        
        // Disparar evento para atualizar notificações (nova notificação foi criada)
        window.dispatchEvent(new CustomEvent('notificacaoAtualizada'));
        
        // Disparar evento específico para nova notificação (tocar som para o destinatário)
        // O destinatário receberá a notificação via polling ou evento
        if (formData.destinatario_id && parseInt(formData.destinatario_id) !== parseInt(user?.id)) {
          // Notificação foi criada para outro usuário - disparar evento
          window.dispatchEvent(new CustomEvent('novaNotificacao', {
            detail: { destinatario_id: formData.destinatario_id }
          }));
        }
      } else {
        console.error(`❌ Erro ao ${solicitacao ? 'atualizar' : 'criar'} solicitação:`, data.error || data);
        setErrors({ general: data.error || 'Erro ao salvar solicitação. Tente novamente.' });
      }
    } catch (error) {
      console.error('Erro ao processar solicitação:', error);
      setErrors({ general: 'Erro de conexão. Verifique sua internet e tente novamente.' });
    }
  };

  // Obter nome completo do usuário
  const getUsuarioNome = (usuarioId) => {
    const usuario = usuarios.find(u => u.id === parseInt(usuarioId));
    if (!usuario) return '';
    const cargo = usuario.cargo ? ` – ${usuario.cargo}` : '';
    return `${usuario.nome}${cargo}`;
  };

  return (
    <form className="modal-form p-6 pt-8 space-y-6" onSubmit={handleSubmit}>
      {/* Mensagem de erro geral */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {errors.general}
        </div>
      )}

      {/* Solicitante (preenchido automaticamente) */}
      <div>
        <label htmlFor="solicitacao-solicitante" className="block text-sm font-medium text-gray-700 mb-2">
          Solicitante *
        </label>
        <input
          type="text"
          id="solicitacao-solicitante"
          value={getUsuarioNome(formData.solicitante_id)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
          disabled
          readOnly
        />
        <input
          type="hidden"
          name="solicitante_id"
          value={formData.solicitante_id}
        />
        <p className="text-xs text-gray-500 mt-1">Preenchido automaticamente com a conta logada</p>
      </div>

      {/* Destinatário */}
      <div>
        <label htmlFor="solicitacao-destinatario" className="block text-sm font-medium text-gray-700 mb-2">
          Destinatário *
        </label>
        <select
          id="solicitacao-destinatario"
          name="destinatario_id"
          value={formData.destinatario_id}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.destinatario_id ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={loadingUsuarios}
          required
        >
          <option value="">
            {loadingUsuarios ? 'Carregando usuários...' : 'Selecione o destinatário'}
          </option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome}{usuario.cargo ? ` – ${usuario.cargo}` : ''}
            </option>
          ))}
        </select>
        {errors.destinatario_id && (
          <p className="text-red-600 text-sm mt-1">{errors.destinatario_id}</p>
        )}
      </div>

      {/* Assunto */}
      <div>
        <label htmlFor="solicitacao-assunto" className="block text-sm font-medium text-gray-700 mb-2">
          Assunto *
        </label>
        <input
          type="text"
          id="solicitacao-assunto"
          name="assunto"
          value={formData.assunto}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.assunto ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Ex: Pedido de compra de peça"
          required
        />
        {errors.assunto && (
          <p className="text-red-600 text-sm mt-1">{errors.assunto}</p>
        )}
      </div>

      {/* Tipo de Solicitação */}
      <div>
        <label htmlFor="solicitacao-tipo" className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Solicitação *
        </label>
        <select
          id="solicitacao-tipo"
          name="tipo"
          value={formData.tipo}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.tipo ? 'border-red-300' : 'border-gray-300'
          }`}
          required
        >
          <option value="">Selecione o tipo</option>
          <option value="Solicitação de peça">Solicitação de peça</option>
          <option value="Solicitação de aprovação">Solicitação de aprovação</option>
          <option value="Solicitação de pagamento">Solicitação de pagamento</option>
          <option value="Solicitação de informação">Solicitação de informação</option>
          <option value="Outro">Outro</option>
        </select>
        {errors.tipo && (
          <p className="text-red-600 text-sm mt-1">{errors.tipo}</p>
        )}
      </div>

      {/* Descrição / Detalhes */}
      <div>
        <label htmlFor="solicitacao-descricao" className="block text-sm font-medium text-gray-700 mb-2">
          Descrição / Detalhes *
        </label>
        <textarea
          id="solicitacao-descricao"
          name="descricao"
          value={formData.descricao}
          onChange={handleInputChange}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none ${
            errors.descricao ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Ex: Solicito a compra de um filtro de óleo modelo XYZ para o veículo Civic, placa TOT-3030."
          required
        />
        {errors.descricao && (
          <p className="text-red-600 text-sm mt-1">{errors.descricao}</p>
        )}
      </div>

      {/* Prioridade */}
      <div>
        <label htmlFor="solicitacao-prioridade" className="block text-sm font-medium text-gray-700 mb-2">
          Prioridade
        </label>
        <select
          id="solicitacao-prioridade"
          name="prioridade"
          value={formData.prioridade}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="Baixa">Baixa</option>
          <option value="Média">Média</option>
          <option value="Alta">Alta</option>
          <option value="Urgente">Urgente</option>
        </select>
      </div>
    </form>
  );
};

export default FormSolicitacao;

