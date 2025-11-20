import React, { useState, useEffect } from 'react';
import { API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';

const FormCliente = ({ cliente = null, onSave = null }) => {
  const { user } = useAuth();
  const { closeModal } = useModal();
  const [formData, setFormData] = useState({
    nome: cliente?.nome || '',
    cpfCnpj: cliente?.cpf || cliente?.cnpj || '',
    whatsapp: cliente?.whatsapp || '',
    email: cliente?.email || '',
    endereco: cliente?.endereco || ''
  });

  // Atualizar formData quando cliente mudar (para edição)
  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome || '',
        cpfCnpj: cliente.cpf || cliente.cnpj || '',
        whatsapp: cliente.whatsapp || '',
        email: cliente.email || '',
        endereco: cliente.endereco || ''
      });
    }
  }, [cliente]);
  const [errors, setErrors] = useState({});

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
    if (!formData.nome.trim()) {
      setErrors({ nome: 'Nome é obrigatório' });
      return;
    }

    // Não fechar modal imediatamente - esperar resposta do servidor

    try {
      // Separar CPF e CNPJ
      const cpfCnpjValue = formData.cpfCnpj.trim().replace(/[^\d]/g, '');
      const isCNPJ = cpfCnpjValue.length === 14;
      const isCPF = cpfCnpjValue.length === 11;

      // Obter estabelecimento_id (pode estar em user.estabelecimento_id ou user.estabelecimento.id)
      const estabelecimentoId = user.estabelecimento_id || user.estabelecimento?.id

      const dataToSend = {
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome.trim(),
        cpf: isCPF ? cpfCnpjValue : null,
        cnpj: isCNPJ ? cpfCnpjValue : null,
        whatsapp: formData.whatsapp.trim(),
        email: formData.email.trim() || null,
        endereco: formData.endereco.trim() || null,
        status: cliente?.status || 'Ativo'
      };

      const url = cliente ? `${API_URL}/api/auth/clientes/${cliente.id}` : `${API_URL}/api/auth/clientes`;
      const method = cliente ? 'PUT' : 'POST';

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
        const clienteSalvo = data.cliente || data;
        console.log(`✅ Cliente ${cliente ? 'atualizado' : 'cadastrado'} com sucesso!`, clienteSalvo);
        
        // Se há callback onSave, chamar (para atualização local sem reload)
        if (onSave) {
          onSave(clienteSalvo);
        }
        
        // Disparar evento para adicionar cliente diretamente na lista - sem loading
        if (cliente) {
          // Cliente atualizado
          window.dispatchEvent(new CustomEvent('clienteAtualizado', {
            detail: clienteSalvo
          }));
        } else {
          // Cliente criado - adicionar diretamente na lista
          window.dispatchEvent(new CustomEvent('addCliente', {
            detail: clienteSalvo
          }));
        }
        
        // Disparar evento para fechar modal (Base.jsx escuta esse evento e fecha automaticamente)
        window.dispatchEvent(new CustomEvent('modalSaveSuccess', {
          detail: { cliente: clienteSalvo }
        }));
      } else {
        console.error(`❌ Erro ao ${cliente ? 'atualizar' : 'cadastrar'} cliente:`, data.error || data);
        setErrors({ general: data.error || 'Erro ao salvar cliente. Tente novamente.' });
      }
    } catch (error) {
      console.error('Erro ao processar cliente:', error);
      setErrors({ general: 'Erro de conexão. Verifique sua internet e tente novamente.' });
    }
  };

  return (
    <form className="modal-form p-6 pt-8 space-y-6" onSubmit={handleSubmit}>
      {/* Mensagem de erro geral */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {errors.general}
        </div>
      )}

      {/* Nome */}
      <div>
        <label htmlFor="cliente-nome" className="block text-sm font-medium text-gray-700 mb-2">
          Nome *
        </label>
        <input
          type="text"
          id="cliente-nome"
          name="nome"
          value={formData.nome}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.nome ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Digite o nome completo"
          required
        />
        {errors.nome && (
          <p className="text-red-600 text-sm mt-1">{errors.nome}</p>
        )}
      </div>

      {/* CPF/CNPJ */}
      <div>
        <label htmlFor="cliente-cpfCnpj" className="block text-sm font-medium text-gray-700 mb-2">
          CPF/CNPJ
        </label>
        <input
          type="text"
          id="cliente-cpfCnpj"
          name="cpfCnpj"
          value={formData.cpfCnpj}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.cpfCnpj ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="000.000.000-00 ou 00.000.000/0000-00"
        />
        {errors.cpfCnpj && (
          <p className="text-red-600 text-sm mt-1">{errors.cpfCnpj}</p>
        )}
      </div>

      {/* WhatsApp */}
      <div>
        <label htmlFor="cliente-whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
          WhatsApp
        </label>
        <input
          type="text"
          id="cliente-whatsapp"
          name="whatsapp"
          value={formData.whatsapp}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.whatsapp ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="(11) 99999-9999"
        />
        {errors.whatsapp && (
          <p className="text-red-600 text-sm mt-1">{errors.whatsapp}</p>
        )}
      </div>

      {/* E-mail */}
      <div>
        <label htmlFor="cliente-email" className="block text-sm font-medium text-gray-700 mb-2">
          E-mail
        </label>
        <input
          type="email"
          id="cliente-email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="email@exemplo.com"
        />
      </div>

      {/* Endereço */}
      <div>
        <label htmlFor="cliente-endereco" className="block text-sm font-medium text-gray-700 mb-2">
          Endereço
        </label>
        <textarea
          id="cliente-endereco"
          name="endereco"
          value={formData.endereco}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          placeholder="Rua, número, complemento, bairro, cidade, CEP"
        />
      </div>
    </form>
  );
};

export default FormCliente;

