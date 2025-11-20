import React, { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { API_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const FormServico = ({ servico = null, onSave = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nome: servico?.nome || '',
    categoria_id: servico?.categoria_id || '',
    preco: servico?.preco || '',
    tempo: servico?.tempo_servico || servico?.tempo || '',
    imagem: null
  });
  const [imagePreview, setImagePreview] = useState(servico?.imagem || null);
  const [errors, setErrors] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  useEffect(() => {
    if (servico) {
      setFormData({
        nome: servico.nome || '',
        categoria_id: servico.categoria_id || '',
        preco: servico.preco || '',
        tempo: servico.tempo_servico || servico.tempo || '',
        imagem: servico.imagem ? 'existing' : null
      });
      setImagePreview(servico.imagem || null);
    } else {
      setFormData({
        nome: '',
        categoria_id: '',
        preco: '',
        tempo: '',
        imagem: null
      });
      setImagePreview(null);
    }
  }, [servico]);

  // Carregar categorias
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        setLoadingCategorias(true);
        const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
        const response = await fetch(`${API_URL}/api/auth/categorias?estabelecimento_id=${estabelecimentoId}`);
        const data = await response.json();

        if (response.ok) {
          setCategorias(data.categorias || []);
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
    const fileInput = document.getElementById('servico-image');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validações
    if (!formData.nome.trim()) {
      setErrors({ nome: 'Nome do serviço é obrigatório' });
      return;
    }

    if (!formData.categoria_id) {
      setErrors({ categoria_id: 'Categoria é obrigatória' });
      return;
    }

    if (!formData.preco || parseFloat(formData.preco) <= 0) {
      setErrors({ preco: 'Preço deve ser maior que zero' });
      return;
    }

    const tempoString = String(formData.tempo || '').trim();
    if (!tempoString) {
      setErrors({ tempo: 'Tempo é obrigatório' });
      return;
    }

    try {
      const formDataToSend = new FormData();
      const estabelecimentoId = user?.estabelecimento_id || user?.estabelecimento?.id;
      formDataToSend.append('estabelecimento_id', estabelecimentoId);
      formDataToSend.append('categoria_id', formData.categoria_id);
      formDataToSend.append('nome', formData.nome.trim());
      formDataToSend.append('preco', formData.preco);
      formDataToSend.append('tempo_servico', tempoString);
      // Manter status atual ao editar, ou usar 'Ativo' ao criar
      formDataToSend.append('status', servico?.status || 'Ativo');
      
      if (formData.imagem && formData.imagem !== 'existing') {
        formDataToSend.append('imagem', formData.imagem);
      }

      const url = servico ? `${API_URL}/api/auth/servicos/${servico.id}` : `${API_URL}/api/auth/servicos`;
      const method = servico ? 'PUT' : 'POST';

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
        setErrors({ general: `Erro ao salvar serviço: ${response.status} ${response.statusText}` });
        return;
      }

      if (response.ok) {
        const servicoSalvo = data.servico || data.item;
        // Chamar callback onSave se fornecido
        if (onSave && servicoSalvo) {
          onSave(servicoSalvo);
        }
        // Disparar evento para adicionar serviço diretamente na lista - sem loading
        if (servico) {
          // Serviço atualizado
          window.dispatchEvent(new CustomEvent('servicoAtualizado', {
            detail: { servico: servicoSalvo }
          }));
        } else {
          // Serviço criado - adicionar diretamente na lista
          window.dispatchEvent(new CustomEvent('addServico', {
            detail: servicoSalvo
          }));
          window.dispatchEvent(new CustomEvent('servicoCriado', {
            detail: { servico: servicoSalvo }
          }));
        }
        console.log(`✅ Serviço ${servico ? 'atualizado' : 'cadastrado'} com sucesso!`);
        // Fechar modal após sucesso
        window.dispatchEvent(new CustomEvent('modalSaveSuccess', {
          detail: servicoSalvo
        }));
      } else {
        console.error(`❌ Erro ao ${servico ? 'atualizar' : 'cadastrar'} serviço:`, data.error || data);
        setErrors({ general: data.error || 'Erro ao salvar serviço' });
      }
    } catch (error) {
      console.error('Erro ao processar serviço:', error);
    }
  };

  return (
    <form className="modal-form p-6 pt-8 space-y-6" onSubmit={handleSubmit}>
      {/* Nome */}
      <div>
        <label htmlFor="servico-nome" className="block text-sm font-medium text-gray-700 mb-2">
          Nome do Serviço *
        </label>
        <input
          type="text"
          id="servico-nome"
          name="nome"
          value={formData.nome}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
            errors.nome ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Digite o nome do serviço"
          required
        />
        {errors.nome && (
          <p className="text-red-600 text-sm mt-1">{errors.nome}</p>
        )}
      </div>

      {/* Categoria */}
      <div>
        <label htmlFor="servico-categoria" className="block text-sm font-medium text-gray-700 mb-2">
          Categoria *
        </label>
        <select
          id="servico-categoria"
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
        <label htmlFor="servico-image" className="block text-sm font-medium text-gray-700 mb-2">
          Imagem
        </label>
        <div className="relative">
          <input
            type="file"
            id="servico-image"
            name="imagem"
            onChange={handleImageChange}
            accept="image/*"
            className="sr-only"
          />
          <label
            htmlFor="servico-image"
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

      {/* Valor do Serviço e Tempo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="servico-preco" className="block text-sm font-medium text-gray-700 mb-2">
            Valor do Serviço *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
            <input
              type="number"
              id="servico-preco"
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
        <label htmlFor="servico-tempo" className="block text-sm font-medium text-gray-700 mb-2">
          Tempo *
        </label>
          <input
            type="text"
            id="servico-tempo"
            name="tempo"
            value={formData.tempo}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
              errors.tempo ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ex: 1h 30min"
            required
          />
          {errors.tempo && (
            <p className="text-red-600 text-sm mt-1">{errors.tempo}</p>
          )}
        </div>
      </div>
    </form>
  );
};

export default FormServico;

