import React, { useState, useEffect } from 'react';
import { API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const FormOrdemServico = ({ ordem = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    cliente_id: ordem?.cliente_id || '',
    veiculo_id: ordem?.veiculo_id || '',
    descricao: ordem?.descricao || '',
    observacoes: ordem?.observacoes || '',
    responsavel_id: ordem?.resposavel || ordem?.responsavel_id || '',
    previsao_saida: ordem?.previsao_saida 
      ? new Date(ordem.previsao_saida).toISOString().slice(0, 16)
      : ''
  });
  const [errors, setErrors] = useState({});
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingVeiculos, setLoadingVeiculos] = useState(true);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);

  // Carregar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      if (!user) return;
      
      try {
        setLoadingClientes(true);
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
        
        if (!estabelecimentoId) {
          setLoadingClientes(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/auth/clientes?estabelecimento_id=${estabelecimentoId}`);
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          const text = await response.text();
          console.error('❌ Resposta não é JSON:', text);
          setLoadingClientes(false);
          return;
        }

        if (response.ok) {
          setClientes(data.clientes || data || []);
        }
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
      } finally {
        setLoadingClientes(false);
      }
    };

    fetchClientes();
  }, [user]);

  // Carregar veículos do estabelecimento
  useEffect(() => {
    const fetchVeiculos = async () => {
      if (!user) {
        setVeiculos([]);
        setLoadingVeiculos(false);
        return;
      }

      try {
        setLoadingVeiculos(true);
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
        
        if (!estabelecimentoId) {
          setVeiculos([]);
          setLoadingVeiculos(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/auth/veiculos?estabelecimento_id=${estabelecimentoId}`);
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          const text = await response.text();
          console.error('❌ Resposta não é JSON:', text);
          setVeiculos([]);
          setLoadingVeiculos(false);
          return;
        }

        if (response.ok) {
          // Filtrar veículos apenas do cliente selecionado se houver
          const veiculosList = data.veiculos || data || [];
          const filteredVeiculos = formData.cliente_id 
            ? veiculosList.filter(v => v.cliente_id === parseInt(formData.cliente_id))
            : veiculosList;
          setVeiculos(filteredVeiculos);
          
          // Se houver cliente selecionado e veículos disponíveis, selecionar automaticamente o primeiro
          if (formData.cliente_id && filteredVeiculos.length > 0) {
            setFormData(prev => ({
              ...prev,
              veiculo_id: filteredVeiculos[0].id.toString()
            }));
          }
        }
      } catch (error) {
        console.error('Erro ao buscar veículos:', error);
      } finally {
        setLoadingVeiculos(false);
      }
    };

    fetchVeiculos();
  }, [user, formData.cliente_id]);

  // Carregar usuários do estabelecimento
  useEffect(() => {
    const fetchUsuarios = async () => {
      if (!user) return;
      
      try {
        setLoadingUsuarios(true);
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
        
        if (!estabelecimentoId) {
          setLoadingUsuarios(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/auth/usuarios?estabelecimento_id=${estabelecimentoId}`);
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          const text = await response.text();
          console.error('❌ Resposta não é JSON:', text);
          setLoadingUsuarios(false);
          return;
        }

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
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Se mudou o cliente, limpar veículo e filtrar veículos
      if (name === 'cliente_id') {
        newData.veiculo_id = '';
        // O useEffect já vai filtrar os veículos e selecionar o primeiro automaticamente
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validações
    if (!formData.cliente_id) {
      setErrors({ cliente_id: 'Cliente é obrigatório' });
      return;
    }

    if (!formData.veiculo_id) {
      setErrors({ veiculo_id: 'Veículo é obrigatório' });
      return;
    }

    if (!formData.descricao.trim()) {
      setErrors({ descricao: 'Descrição é obrigatória' });
      return;
    }

    try {
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
      
      if (!estabelecimentoId) {
        setErrors({ general: 'Estabelecimento não identificado' });
        return;
      }

      const dataToSend = {
        estabelecimento_id: estabelecimentoId,
        cliente_id: parseInt(formData.cliente_id),
        veiculo_id: parseInt(formData.veiculo_id),
        descricao: formData.descricao.trim(),
        observacoes: formData.observacoes.trim() || null,
        responsavel_id: formData.responsavel_id ? parseInt(formData.responsavel_id) : null,
        previsao_saida: formData.previsao_saida || null,
        status: 'Pendente',
        aberto_por: user?.id ? parseInt(user.id) : null
      };

      const url = ordem 
        ? `${API_URL}/api/auth/ordens/${ordem.id}` 
        : `${API_URL}/api/auth/ordens`;
      const method = ordem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        console.error('❌ Resposta não é JSON:', text);
        setErrors({ general: `Erro ao salvar ordem: ${response.status} ${response.statusText}` });
        return;
      }

      if (response.ok) {
        const ordemSalva = data.ordem || data;
        console.log(`✅ Ordem ${ordem ? 'atualizada' : 'cadastrada'} com sucesso!`);
        
        // Disparar evento para adicionar ordem diretamente na lista - sem loading
        if (ordem) {
          // Ordem atualizada
          window.dispatchEvent(new CustomEvent('ordemAtualizada', {
            detail: { ordem: ordemSalva }
          }));
        } else {
          // Ordem criada - adicionar diretamente na lista
          window.dispatchEvent(new CustomEvent('addOrdem', {
            detail: ordemSalva
          }));
          window.dispatchEvent(new CustomEvent('ordemCriada', {
            detail: { ordem: ordemSalva }
          }));
        }
        
        // Fechar modal após sucesso
        window.dispatchEvent(new CustomEvent('modalSaveSuccess', {
          detail: ordemSalva
        }));
      } else {
        console.error(`❌ Erro ao ${ordem ? 'atualizar' : 'cadastrar'} ordem:`, data.error || data);
        setErrors({ general: data.error || 'Erro ao salvar ordem' });
      }
    } catch (error) {
      console.error('Erro ao processar ordem:', error);
    }
  };

  return (
    <form className="modal-form p-6 pt-8 space-y-6" onSubmit={handleSubmit}>
      {/* Mensagem de erro geral */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="text-sm">{errors.general}</p>
        </div>
      )}
      
      {/* Cliente */}
      <div>
        <label htmlFor="ordem-cliente" className="block text-sm font-medium text-gray-700 mb-2">
          Cliente *
        </label>
        <select
          id="ordem-cliente"
          name="cliente_id"
          value={formData.cliente_id}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.cliente_id ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={loadingClientes}
          required
        >
          <option value="">
            {loadingClientes ? 'Carregando clientes...' : 'Selecione um cliente'}
          </option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
        {errors.cliente_id && (
          <p className="text-red-600 text-sm mt-1">{errors.cliente_id}</p>
        )}
      </div>

      {/* Veículo */}
      <div>
        <label htmlFor="ordem-veiculo" className="block text-sm font-medium text-gray-700 mb-2">
          Veículo *
        </label>
        <select
          id="ordem-veiculo"
          name="veiculo_id"
          value={formData.veiculo_id}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.veiculo_id ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={loadingVeiculos || !formData.cliente_id}
          required
        >
          <option value="">
            {!formData.cliente_id 
              ? 'Selecione primeiro um cliente'
              : loadingVeiculos 
              ? 'Carregando veículos...' 
              : 'Selecione um veículo'}
          </option>
          {veiculos.map((veiculo) => {
            const label = veiculo.placa 
              ? `${veiculo.marca || ''} ${veiculo.modelo || ''} - ${veiculo.placa}`.trim()
              : veiculo.veiculo || `Veículo ${veiculo.id}`;
            return (
              <option key={veiculo.id} value={veiculo.id}>
                {label}
              </option>
            );
          })}
        </select>
        {errors.veiculo_id && (
          <p className="text-red-600 text-sm mt-1">{errors.veiculo_id}</p>
        )}
      </div>

      {/* Descrição */}
      <div>
        <label htmlFor="ordem-descricao" className="block text-sm font-medium text-gray-700 mb-2">
          Descrição *
        </label>
        <textarea
          id="ordem-descricao"
          name="descricao"
          value={formData.descricao}
          onChange={handleInputChange}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none ${
            errors.descricao ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Descreva os serviços a serem realizados"
          required
        />
        {errors.descricao && (
          <p className="text-red-600 text-sm mt-1">{errors.descricao}</p>
        )}
      </div>

      {/* Observações */}
      <div>
        <label htmlFor="ordem-observacoes" className="block text-sm font-medium text-gray-700 mb-2">
          Observações
        </label>
        <textarea
          id="ordem-observacoes"
          name="observacoes"
          value={formData.observacoes}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          placeholder="Observações adicionais (opcional)"
        />
      </div>

      {/* Responsável */}
      <div>
        <label htmlFor="ordem-responsavel" className="block text-sm font-medium text-gray-700 mb-2">
          Responsável
        </label>
        <select
          id="ordem-responsavel"
          name="responsavel_id"
          value={formData.responsavel_id}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.responsavel_id ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={loadingUsuarios}
        >
          <option value="">
            {loadingUsuarios ? 'Carregando usuários...' : 'Selecione um responsável (opcional)'}
          </option>
          {usuarios
            .filter(u => ['Mecânico','Assistente Mecânico'].includes(u.cargo))
            .map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
        </select>
        {errors.responsavel_id && (
          <p className="text-red-600 text-sm mt-1">{errors.responsavel_id}</p>
        )}
      </div>

      {/* Previsão de Saída */}
      <div>
        <label htmlFor="ordem-previsao-saida" className="block text-sm font-medium text-gray-700 mb-2">
          Previsão de Saída
        </label>
        <input
          type="datetime-local"
          id="ordem-previsao-saida"
          name="previsao_saida"
          value={formData.previsao_saida}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.previsao_saida ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {errors.previsao_saida && (
          <p className="text-red-600 text-sm mt-1">{errors.previsao_saida}</p>
        )}
      </div>
    </form>
  );
};

export default FormOrdemServico;

