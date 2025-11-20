import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const FormCategory = ({ categoria = null, onSave = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Preencher dados quando estiver editando
  useEffect(() => {
    if (categoria) {
      setIsEditing(true);
      setFormData({
        name: categoria.nome || '',
        image: null
      });
      setImagePreview(categoria.imagem || null);
    } else {
      setIsEditing(false);
      setFormData({ name: '', image: null });
      setImagePreview(null);
    }
  }, [categoria]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
    // Limpar o input de arquivo
    const fileInput = document.getElementById('category-image');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    if (!formData.name.trim()) {
      setErrors({ name: 'Nome da categoria é obrigatório' });
      return;
    }

    // Para cadastro, imagem é obrigatória
    if (!isEditing && !formData.image) {
      setErrors({ image: 'Imagem da categoria é obrigatória' });
      return;
    }

    try {
      if (isEditing) {
        // Editar categoria existente
        const updateData = {
          nome: formData.name.trim(),
          status: categoria.status // Manter status atual
        };

        // Se uma nova imagem foi selecionada, incluir na atualização
        if (formData.image) {
          // Para edição com nova imagem, precisamos usar FormData
          const formDataToSend = new FormData();
          formDataToSend.append('nome', formData.name.trim());
          formDataToSend.append('imagem', formData.image);
          formDataToSend.append('status', categoria.status);

          const response = await fetch(`${API_URL}/api/auth/categorias/${categoria.id}`, {
            method: 'PUT',
            body: formDataToSend,
          });

          let data;
          try {
            data = await response.json();
          } catch (jsonError) {
            const text = await response.text();
            console.error('❌ Resposta não é JSON:', text);
            setErrors({ general: `Erro ao atualizar categoria: ${response.status} ${response.statusText}` });
            return;
          }

          if (response.ok) {
            // Atualizar apenas a categoria específica sem recarregar toda a lista
            window.dispatchEvent(new CustomEvent('updateCategoria', {
              detail: { 
                categoria: data.categoria,
                action: 'update'
              }
            }));
            // Chamar callback onSave se fornecido
            if (onSave && data.categoria) {
              onSave(data.categoria);
            }
            // Fechar modal após sucesso
            window.dispatchEvent(new CustomEvent('modalSaveSuccess'));
            console.log('✅ Categoria atualizada com sucesso!');
          } else {
            console.error('❌ Erro ao atualizar categoria:', data.error || data);
            setErrors({ general: data.error || 'Erro ao atualizar categoria' });
          }
        } else {
          // Editar apenas nome (mantém imagem existente)
          const updateDataWithImage = {
            ...updateData,
            imagem: categoria.imagem // Manter imagem existente
          };

          const response = await fetch(`${API_URL}/api/auth/categorias/${categoria.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateDataWithImage),
          });

          let data;
          try {
            data = await response.json();
          } catch (jsonError) {
            const text = await response.text();
            console.error('❌ Resposta não é JSON:', text);
            setErrors({ general: `Erro ao atualizar categoria: ${response.status} ${response.statusText}` });
            return;
          }

          if (response.ok) {
            // Atualizar apenas a categoria específica sem recarregar toda a lista
            window.dispatchEvent(new CustomEvent('updateCategoria', {
              detail: { 
                categoria: data.categoria,
                action: 'update'
              }
            }));
            // Chamar callback onSave se fornecido
            if (onSave && data.categoria) {
              onSave(data.categoria);
            }
            // Fechar modal após sucesso
            window.dispatchEvent(new CustomEvent('modalSaveSuccess'));
            console.log('✅ Categoria atualizada com sucesso!');
          } else {
            console.error('❌ Erro ao atualizar categoria:', data.error || data);
            setErrors({ general: data.error || 'Erro ao atualizar categoria' });
          }
        }
      } else {
        // Criar nova categoria
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
        if (!estabelecimentoId) {
          setErrors({ general: 'Estabelecimento não encontrado' });
          return;
        }

        const formDataToSend = new FormData();
        formDataToSend.append('estabelecimento_id', estabelecimentoId);
        formDataToSend.append('nome', formData.name.trim());
        formDataToSend.append('imagem', formData.image);

        const response = await fetch(`${API_URL}/api/auth/categorias`, {
          method: 'POST',
          body: formDataToSend,
        });

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          const text = await response.text();
          console.error('❌ Resposta não é JSON:', text);
          setErrors({ general: `Erro ao salvar categoria: ${response.status} ${response.statusText}` });
          return;
        }

        if (response.ok) {
          // Disparar evento para adicionar categoria diretamente na lista - sem loading
          window.dispatchEvent(new CustomEvent('addCategoria', {
            detail: data.categoria
          }));
          // Chamar callback onSave se fornecido
          if (onSave && data.categoria) {
            onSave(data.categoria);
          }
          console.log('✅ Categoria cadastrada com sucesso!', data);
          // Disparar evento para fechar modal
          window.dispatchEvent(new CustomEvent('modalSaveSuccess', {
            detail: data.categoria
          }));
        } else {
          console.error('❌ Erro ao cadastrar categoria:', data.error || data);
          setErrors({ general: data.error || 'Erro ao cadastrar categoria' });
        }
      }
    } catch (error) {
      console.error('Erro ao processar categoria:', error);
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

      {/* Nome da Categoria */}
      <div className="space-y-2">
        <label htmlFor="category-name" className="block text-sm font-medium text-gray-700">
          Nome da Categoria
        </label>
        <input
          type="text"
          id="category-name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors duration-200 ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Digite o nome da categoria"
          required
        />
        {errors.name && (
          <p className="text-red-600 text-sm">{errors.name}</p>
        )}
      </div>

      {/* Upload de Imagem */}
      <div className="space-y-2">
        <label htmlFor="category-image" className="block text-sm font-medium text-gray-700">
          Imagem da Categoria
        </label>
        
        {/* Input de arquivo customizado */}
        <div className="relative">
          <input
            type="file"
            id="category-image"
            name="image"
            onChange={handleImageChange}
            accept="image/*"
            className="sr-only"
            required={!isEditing}
          />
          <label
            htmlFor="category-image"
            className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-slate-900 hover:bg-gray-50 transition-colors duration-200 relative overflow-hidden"
          >
            {imagePreview ? (
              <div className="relative w-full h-full">
                <img
                  src={imagePreview}
                  alt="Preview da categoria"
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveImage();
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs text-center py-1 rounded">
                  Clique para alterar
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Clique para fazer upload</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, JPEG até 5MB</p>
              </div>
            )}
          </label>
        </div>

        {/* Especificação de formato */}
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">
            <strong>Formatos aceitos:</strong> PNG, JPG, JPEG
          </p>
          <p className="text-xs text-gray-600 mt-1">
            <strong>Tamanho máximo:</strong> 5MB
          </p>
          <p className="text-xs text-gray-600 mt-1">
            <strong>Dimensões recomendadas:</strong> 400x400px
          </p>
        </div>
        
        {errors.image && (
          <p className="text-red-600 text-sm">{errors.image}</p>
        )}
      </div>
    </form>
  );
};

export default FormCategory;
