import React, { useState, useEffect } from 'react';
import ListBase from './ListBase';
import CategoryCard from '../cards/CategoryCard';
import FormCategory from '../forms/FormCategory';
import { API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { Tag } from 'lucide-react';
import { getCachedData, setCachedData } from '../../hooks/useCache';

const ListCategory = ({ 
  onEdit, 
  onDelete, 
  onToggleStatus,
  className = "",
  refreshKey
}) => {
  const { user } = useAuth();
  const { openModal } = useModal();
  const [categorias, setCategorias] = useState(() => {
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
    if (estabelecimentoId) {
      return getCachedData(`categorias_${estabelecimentoId}`) || []
    }
    return []
  });
  const [error, setError] = useState(null);

  const fetchCategorias = async () => {
    if (!user) return;
    
    const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
    if (!estabelecimentoId) {
      console.warn('Estabelecimento ID não encontrado');
      return;
    }

    // Carregar do cache primeiro
    const cached = getCachedData(`categorias_${estabelecimentoId}`)
    if (cached) {
      setCategorias(cached)
    }

    try {
      setError(null);
      
      const response = await fetch(`${API_URL}/api/auth/categorias?estabelecimento_id=${estabelecimentoId}`);
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        console.error('❌ Resposta não é JSON:', text);
        setError(`Erro ao carregar categorias: ${response.status} ${response.statusText}`);
        return;
      }

      if (response.ok) {
        const categoriasData = data.categorias || []
        setCategorias(categoriasData)
        setCachedData(`categorias_${estabelecimentoId}`, categoriasData)
      } else {
        setError(data.error || 'Erro ao carregar categorias');
      }
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
      const currentCache = getCachedData(`categorias_${estabelecimentoId}`)
      if (!currentCache) {
        setCategorias([])
        setError('Erro de conexão. Tente novamente.');
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchCategorias();
    }
  }, [user, refreshKey]);

  // Escutar eventos de refresh da lista
  useEffect(() => {
    const handleRefreshList = () => {
      console.log('🔄 Evento de refresh recebido, atualizando lista...');
      fetchCategorias();
    };

    const handleUpdateCategoria = (event) => {
      const { categoria, action } = event.detail;
      console.log('🔄 Atualizando categoria específica:', categoria);
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      
      if (action === 'update') {
        const updated = categorias.map(cat => cat.id === categoria.id ? categoria : cat)
        setCategorias(updated)
        if (estabelecimentoId) {
          setCachedData(`categorias_${estabelecimentoId}`, updated)
        }
      }
    };

    const handleAddCategoria = (event) => {
      const novaCategoria = event.detail;
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
      const updated = [...categorias, novaCategoria].sort((a, b) => a.nome.localeCompare(b.nome))
      setCategorias(updated)
      if (estabelecimentoId) {
        setCachedData(`categorias_${estabelecimentoId}`, updated)
      }
    };

    // Adicionar listeners
    window.addEventListener('refreshCategorias', handleRefreshList);
    window.addEventListener('updateCategoria', handleUpdateCategoria);
    window.addEventListener('addCategoria', handleAddCategoria);

    // Cleanup
    return () => {
      window.removeEventListener('refreshCategorias', handleRefreshList);
      window.removeEventListener('updateCategoria', handleUpdateCategoria);
      window.removeEventListener('addCategoria', handleAddCategoria);
    };
  }, []);

  const handleEdit = (categoria) => {
    // Abrir modal com FormCategory preenchido
    openModal(
      <FormCategory 
        categoria={categoria} 
        onSave={(categoriaAtualizada) => {
          const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
          const updated = categorias.map(c => c.id === categoriaAtualizada.id ? categoriaAtualizada : c)
          setCategorias(updated)
          if (estabelecimentoId) {
            setCachedData(`categorias_${estabelecimentoId}`, updated)
          }
        }} 
      />
    );
    
    // Chamar callback se fornecido (para compatibilidade)
    if (onEdit) {
      onEdit(categoria);
    }
  };

  const handleDelete = (categoria) => {
    if (onDelete) {
      onDelete(categoria);
    }
  };

  const handleToggleStatus = async (categoria) => {
    const novoStatus = categoria.status === 'Ativo' ? 'Inativo' : 'Ativo';
    
    try {
      const response = await fetch(`${API_URL}/api/auth/categorias/${categoria.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: novoStatus
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Categoria ${novoStatus === 'Ativo' ? 'ativada' : 'desativada'} com sucesso!`);
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id
        const updated = categorias.map(cat => cat.id === categoria.id ? { ...cat, status: novoStatus } : cat)
        setCategorias(updated)
        if (estabelecimentoId) {
          setCachedData(`categorias_${estabelecimentoId}`, updated)
        }
        
        if (onToggleStatus) {
          onToggleStatus(categoria, novoStatus);
        }
      } else {
        console.error('❌ Erro ao alterar status:', data.error);
        alert(data.error || 'Erro ao alterar status da categoria');
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      alert('Erro de conexão. Tente novamente.');
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <ListBase
      className={`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}
      emptyMessage="Nenhuma categoria cadastrada"
    >
      {categorias.map((categoria) => (
        <CategoryCard
          key={categoria.id}
          categoria={categoria}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
      ))}
    </ListBase>
  );
};

export default ListCategory;
