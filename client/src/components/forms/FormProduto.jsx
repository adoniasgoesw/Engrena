import React, { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const FormProduto = ({ produto = null, onSave = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nome: produto?.nome || '',
    categoria_id: produto?.categoria_id || '',
    preco: produto?.preco || '',
    preco_custo: produto?.preco_custo || '',
    estoque: produto?.estoque || '',
    imagem: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  useEffect(() => {
    if (produto) {
      setFormData({
        nome: produto.nome || '',
        categoria_id: produto.categoria_id || '',
        preco: produto.preco || '',
        preco_custo: produto.preco_custo || '',
        estoque: produto.estoque || '',
        imagem: produto.imagem ? 'existing' : null
      });
      setImagePreview(produto.imagem || null);
    } else {
      setFormData({
        nome: '',
        categoria_id: '',
        preco: '',
        preco_custo: '',
        estoque: '',
        imagem: null
      });
      setImagePreview(null);
    }
  }, [produto]);

  // Carregar categorias para o dropdown
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        setLoadingCategorias(true);
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
        const response = await fetch(`${API_URL}/api/auth/categorias?estabelecimento_id=${estabelecimentoId}`);
        const data = await response.json();

        if (response.ok) {
          setCategorias(data.categorias || []);
        } else {
          console.error('Erro ao carregar categorias:', data.error);
        }
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
      } finally {
        setLoadingCategorias(false);
      }
    };

    if (user) {
      fetchCategorias();
    }
  }, [user]);

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
      setFormData(prev => ({ ...prev, imagem: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imagem: null }));
    setImagePreview(null);
    const fileInput = document.getElementById('produto-image');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validações
    if (!formData.nome.trim()) {
      setErrors({ nome: 'Nome do produto é obrigatório' });
      return;
    }

    if (!formData.categoria_id) {
      setErrors({ categoria_id: 'Categoria é obrigatória' });
      return;
    }

    if (!formData.preco || parseFloat(formData.preco) <= 0) {
      setErrors({ preco: 'Valor de venda deve ser maior que zero' });
      return;
    }

    if (!formData.preco_custo || parseFloat(formData.preco_custo) <= 0) {
      setErrors({ preco_custo: 'Valor de custo deve ser maior que zero' });
      return;
    }

    if (!formData.estoque || parseInt(formData.estoque) < 0) {
      setErrors({ estoque: 'Estoque deve ser maior ou igual a zero' });
      return;
    }

    try {
      const formDataToSend = new FormData();
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
      formDataToSend.append('estabelecimento_id', estabelecimentoId);
      formDataToSend.append('categoria_id', formData.categoria_id);
      formDataToSend.append('nome', formData.nome.trim());
      formDataToSend.append('preco', formData.preco);
      formDataToSend.append('preco_custo', formData.preco_custo);
      formDataToSend.append('estoque', formData.estoque);
      // Manter status atual ao editar, ou usar 'Ativo' ao criar
      formDataToSend.append('status', produto?.status || 'Ativo');
      
      // Só enviar imagem se for um arquivo novo
      if (formData.imagem && formData.imagem !== 'existing') {
        formDataToSend.append('imagem', formData.imagem);
      }

      const url = produto ? `${API_URL}/api/auth/produtos/${produto.id}` : `${API_URL}/api/auth/produtos`;
      const method = produto ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        body: formDataToSend,
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        console.error('❌ Resposta não é JSON:', text);
        setErrors({ general: `Erro ao salvar produto: ${response.status} ${response.statusText}` });
        return;
      }

      if (response.ok) {
        const produtoSalvo = data.produto || data.item;
        // Chamar callback onSave se fornecido
        if (onSave && produtoSalvo) {
          onSave(produtoSalvo);
        }
        // Disparar evento para adicionar produto diretamente na lista - sem loading
        if (produto) {
          // Produto atualizado
          window.dispatchEvent(new CustomEvent('produtoAtualizado', {
            detail: { produto: produtoSalvo }
          }));
        } else {
          // Produto criado - adicionar diretamente na lista
          window.dispatchEvent(new CustomEvent('addProduto', {
            detail: produtoSalvo
          }));
          window.dispatchEvent(new CustomEvent('produtoCriado', {
            detail: { produto: produtoSalvo }
          }));
        }
        console.log(`✅ Produto ${produto ? 'atualizado' : 'cadastrado'} com sucesso!`);
        // Fechar modal após sucesso
        window.dispatchEvent(new CustomEvent('modalSaveSuccess', {
          detail: produtoSalvo
        }));
      } else {
        console.error(`❌ Erro ao ${produto ? 'atualizar' : 'cadastrar'} produto:`, data.error || data);
        setErrors({ general: data.error || 'Erro ao salvar produto' });
      }
    } catch (error) {
      console.error('Erro ao processar produto:', error);
      setErrors({ general: 'Erro de conexão. Tente novamente.' });
    }
  };

  return (
    <form className="modal-form p-6 pt-8 space-y-6" onSubmit={handleSubmit}>
      {/* Nome */}
      <div>
        <label htmlFor="produto-nome" className="block text-sm font-medium text-gray-700 mb-2">
          Nome do Produto *
        </label>
        <input
          type="text"
          id="produto-nome"
          name="nome"
          value={formData.nome}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.nome ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Digite o nome do produto"
          required
        />
        {errors.nome && (
          <p className="text-red-600 text-sm mt-1">{errors.nome}</p>
        )}
      </div>

      {/* Categoria */}
      <div>
        <label htmlFor="produto-categoria" className="block text-sm font-medium text-gray-700 mb-2">
          Categoria *
        </label>
        <select
          id="produto-categoria"
          name="categoria_id"
          value={formData.categoria_id}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.categoria_id ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={loadingCategorias}
          required
        >
          <option value="">
            {loadingCategorias ? 'Carregando categorias...' : 'Selecione uma categoria'}
          </option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>
        {errors.categoria_id && (
          <p className="text-red-600 text-sm mt-1">{errors.categoria_id}</p>
        )}
      </div>

      {/* Upload de Imagem */}
      <div>
        <label htmlFor="produto-image" className="block text-sm font-medium text-gray-700 mb-2">
          Imagem
        </label>
        <div className="relative">
          <input
            type="file"
            id="produto-image"
            name="imagem"
            onChange={handleImageChange}
            accept="image/*"
            className="sr-only"
          />
          <label
            htmlFor="produto-image"
            className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
          >
            <div className="text-center">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mx-auto h-32 w-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    Clique para selecionar uma imagem
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    PNG, JPG, WEBP até 10MB
                  </span>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Valor de Venda e Valor de Custo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="produto-preco" className="block text-sm font-medium text-gray-700 mb-2">
            Valor de Venda *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
            <input
              type="number"
              id="produto-preco"
              name="preco"
              value={formData.preco}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                errors.preco ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0,00"
              required
            />
          </div>
          {errors.preco && (
            <p className="text-red-600 text-sm mt-1">{errors.preco}</p>
          )}
        </div>

        <div>
          <label htmlFor="produto-preco-custo" className="block text-sm font-medium text-gray-700 mb-2">
            Valor de Custo *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
            <input
              type="number"
              id="produto-preco-custo"
              name="preco_custo"
              value={formData.preco_custo}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                errors.preco_custo ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0,00"
              required
            />
          </div>
          {errors.preco_custo && (
            <p className="text-red-600 text-sm mt-1">{errors.preco_custo}</p>
          )}
        </div>
      </div>

      {/* Estoque */}
      <div>
        <label htmlFor="produto-estoque" className="block text-sm font-medium text-gray-700 mb-2">
          Estoque *
        </label>
        <input
          type="number"
          id="produto-estoque"
          name="estoque"
          value={formData.estoque}
          onChange={handleInputChange}
          min="0"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.estoque ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="0"
          required
        />
        {errors.estoque && (
          <p className="text-red-600 text-sm mt-1">{errors.estoque}</p>
        )}
      </div>
    </form>
  );
};

export default FormProduto;
