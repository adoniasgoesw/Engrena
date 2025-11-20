import React, { useState, useEffect } from 'react';
import { API_URL } from '../../services/api';

const FormChecklist = ({ ordemId, checklistItem = null, onSave = null }) => {
  const [formData, setFormData] = useState({
    descricao: checklistItem?.descricao || checklistItem?.titulo || '',
    prioridade: checklistItem?.prioridade || 'Média'
  });

  const [errors, setErrors] = useState({});

  // Atualizar formData quando checklistItem mudar (para edição)
  useEffect(() => {
    if (checklistItem) {
      setFormData({
        descricao: checklistItem.descricao || checklistItem.titulo || '',
        prioridade: checklistItem.prioridade || 'Média'
      });
    }
  }, [checklistItem]);

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
    if (!formData.descricao.trim()) {
      setErrors({ descricao: 'Descrição da tarefa é obrigatória' });
      return;
    }

    try {
      const dataToSend = {
        descricao: formData.descricao.trim(),
        prioridade: formData.prioridade,
        status: checklistItem?.status || 'Pendente'
      };

      const url = checklistItem 
        ? `${API_URL}/api/auth/ordens/${ordemId}/checklist/${checklistItem.id}` 
        : `${API_URL}/api/auth/ordens/${ordemId}/checklist`;
      const method = checklistItem ? 'PUT' : 'POST';

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
        const itemSalvo = data.item || data.checklist || data;
        console.log(`✅ Item de checklist ${checklistItem ? 'atualizado' : 'criado'} com sucesso!`, itemSalvo);
        
        // Se há callback onSave, chamar
        if (onSave) {
          onSave(itemSalvo);
        }
        
        // Disparar evento para fechar modal
        window.dispatchEvent(new CustomEvent('modalSaveSuccess', {
          detail: { checklist: itemSalvo }
        }));

        // Disparar evento para atualizar lista
        window.dispatchEvent(new CustomEvent('refreshChecklist'));
      } else {
        console.error(`❌ Erro ao ${checklistItem ? 'atualizar' : 'criar'} item de checklist:`, data.error || data);
        setErrors({ general: data.error || 'Erro ao salvar item de checklist. Tente novamente.' });
      }
    } catch (error) {
      console.error('Erro ao processar item de checklist:', error);
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

      {/* Descrição / Tarefa */}
      <div>
        <label htmlFor="checklist-descricao" className="block text-sm font-medium text-gray-700 mb-2">
          Descrição da Tarefa *
        </label>
        <textarea
          id="checklist-descricao"
          name="descricao"
          value={formData.descricao}
          onChange={handleInputChange}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none ${
            errors.descricao ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Ex: Verificar pressão dos pneus"
          required
        />
        {errors.descricao && (
          <p className="text-red-600 text-sm mt-1">{errors.descricao}</p>
        )}
      </div>

      {/* Prioridade */}
      <div>
        <label htmlFor="checklist-prioridade" className="block text-sm font-medium text-gray-700 mb-2">
          Prioridade
        </label>
        <select
          id="checklist-prioridade"
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

export default FormChecklist;

