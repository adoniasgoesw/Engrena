import React, { useState, useEffect } from 'react';
import { API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const FormVeiculo = ({ veiculo = null, onSave }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    cliente_id: veiculo?.cliente_id || '',
    placa: veiculo?.placa || '',
    marca: veiculo?.marca || '',
    modelo: veiculo?.modelo || '',
    ano: veiculo?.ano || '',
    cor: veiculo?.cor || '',
    observacoes: veiculo?.observacoes || ''
  });

  // Atualizar formData quando veiculo mudar (modo edição)
  useEffect(() => {
    if (veiculo) {
      setFormData({
        cliente_id: veiculo.cliente_id || '',
        placa: veiculo.placa || '',
        marca: veiculo.marca || '',
        modelo: veiculo.modelo || '',
        ano: veiculo.ano || '',
        cor: veiculo.cor || '',
        observacoes: veiculo.observacoes || ''
      });
    }
  }, [veiculo]);
  const [errors, setErrors] = useState({});
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  // Carregar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      if (!user) return;
      
      const estabelecimentoId = user.estabelecimento_id || user.estabelecimento?.id;
      if (!estabelecimentoId) return;

      try {
        setLoadingClientes(true);
        const response = await fetch(`${API_URL}/api/auth/clientes?estabelecimento_id=${estabelecimentoId}`);
        const data = await response.json();

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
    if (!formData.cliente_id) {
      setErrors({ cliente_id: 'Cliente é obrigatório' });
      return;
    }

    if (!formData.placa.trim()) {
      setErrors({ placa: 'Placa é obrigatória' });
      return;
    }

    if (!formData.marca.trim()) {
      setErrors({ marca: 'Marca é obrigatória' });
      return;
    }

    if (!formData.modelo.trim()) {
      setErrors({ modelo: 'Modelo é obrigatório' });
      return;
    }

    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
    if (!estabelecimentoId) {
      setErrors({ geral: 'Estabelecimento não encontrado' });
      return;
    }

    try {
      const dataToSend = {
        estabelecimento_id: parseInt(estabelecimentoId),
        cliente_id: parseInt(formData.cliente_id),
        placa: formData.placa.trim(),
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        ano: formData.ano ? parseInt(formData.ano) : null,
        cor: formData.cor.trim() || null,
        observacoes: formData.observacoes.trim() || null,
        status: veiculo?.status || 'Ativo'
      };

      console.log('📤 Enviando dados do veículo:', dataToSend);

      const url = veiculo ? `${API_URL}/api/auth/veiculos/${veiculo.id}` : `${API_URL}/api/auth/veiculos`;
      const method = veiculo ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Veículo ${veiculo ? 'atualizado' : 'cadastrado'} com sucesso!`, data);
        
        // Se há callback onSave, chamar com o veículo
        if (onSave && data.veiculo) {
          onSave(data.veiculo);
        }
        
        // Disparar evento para fechar modal
        window.dispatchEvent(new CustomEvent('modalSaveSuccess', {
          detail: data.veiculo
        }));
        // Disparar evento para atualizar lista
        if (veiculo) {
          // Veículo atualizado
          window.dispatchEvent(new CustomEvent('veiculoAtualizado', {
            detail: data.veiculo
          }));
        } else {
          // Veículo criado
          window.dispatchEvent(new CustomEvent('addVeiculo', {
            detail: data.veiculo
          }));
        }
        window.dispatchEvent(new CustomEvent('refreshVeiculos'));
      } else {
        console.error(`❌ Erro ao ${veiculo ? 'atualizar' : 'cadastrar'} veículo:`, data);
        console.error(`📋 Status: ${response.status}, Dados enviados:`, dataToSend);
        setErrors({ geral: data.error || 'Erro ao salvar veículo' });
      }
    } catch (error) {
      console.error('Erro ao processar veículo:', error);
      setErrors({ geral: 'Erro de conexão. Tente novamente.' });
    }
  };

  return (
    <form className="modal-form p-6 pt-8 space-y-6" onSubmit={handleSubmit}>
      {errors.geral && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {errors.geral}
        </div>
      )}

      {/* Cliente */}
      <div>
        <label htmlFor="veiculo-cliente" className="block text-sm font-medium text-gray-700 mb-2">
          Cliente *
        </label>
        <select
          id="veiculo-cliente"
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

      {/* Placa */}
      <div>
        <label htmlFor="veiculo-placa" className="block text-sm font-medium text-gray-700 mb-2">
          Placa *
        </label>
        <input
          type="text"
          id="veiculo-placa"
          name="placa"
          value={formData.placa}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.placa ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="ABC-1234"
          required
        />
        {errors.placa && (
          <p className="text-red-600 text-sm mt-1">{errors.placa}</p>
        )}
      </div>

      {/* Marca e Modelo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="veiculo-marca" className="block text-sm font-medium text-gray-700 mb-2">
            Marca *
          </label>
          <input
            type="text"
            id="veiculo-marca"
            name="marca"
            value={formData.marca}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
              errors.marca ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ex: Honda"
            required
          />
          {errors.marca && (
            <p className="text-red-600 text-sm mt-1">{errors.marca}</p>
          )}
        </div>

        <div>
          <label htmlFor="veiculo-modelo" className="block text-sm font-medium text-gray-700 mb-2">
            Modelo *
          </label>
          <input
            type="text"
            id="veiculo-modelo"
            name="modelo"
            value={formData.modelo}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
              errors.modelo ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ex: Civic"
            required
          />
          {errors.modelo && (
            <p className="text-red-600 text-sm mt-1">{errors.modelo}</p>
          )}
        </div>
      </div>

      {/* Ano e Cor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="veiculo-ano" className="block text-sm font-medium text-gray-700 mb-2">
            Ano
          </label>
          <input
            type="number"
            id="veiculo-ano"
            name="ano"
            value={formData.ano}
            onChange={handleInputChange}
            min="1900"
            max={new Date().getFullYear() + 1}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Ex: 2020"
          />
        </div>

        <div>
          <label htmlFor="veiculo-cor" className="block text-sm font-medium text-gray-700 mb-2">
            Cor
          </label>
          <input
            type="text"
            id="veiculo-cor"
            name="cor"
            value={formData.cor}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Ex: Branco"
          />
        </div>
      </div>

      {/* Observações */}
      <div>
        <label htmlFor="veiculo-observacoes" className="block text-sm font-medium text-gray-700 mb-2">
          Observações
        </label>
        <textarea
          id="veiculo-observacoes"
          name="observacoes"
          value={formData.observacoes}
          onChange={handleInputChange}
          rows="3"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          placeholder="Observações sobre o veículo..."
        />
      </div>
    </form>
  );
};

export default FormVeiculo;

