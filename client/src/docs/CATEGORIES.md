# Sistema de Categorias

## Visão Geral

Sistema completo para cadastro e gerenciamento de categorias de produtos/serviços, incluindo upload de imagens e validações.

## Funcionalidades

### ✅ Cadastro de Categorias
- Nome da categoria (obrigatório)
- Upload de imagem (obrigatório)
- Validação de dados
- Preview da imagem antes do upload
- Integração com estabelecimento do usuário

### ✅ Validações
- Nome único por estabelecimento
- Formatos de imagem aceitos: PNG, JPG, JPEG
- Tamanho máximo: 5MB
- Dimensões recomendadas: 400x400px

## Estrutura do Banco de Dados

```sql
CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  estabelecimento_id INTEGER NOT NULL,
  nome VARCHAR(120) NOT NULL,
  imagem TEXT,
  status VARCHAR(20) DEFAULT 'Ativo',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## API Endpoints

### POST `/api/categorias`
Cadastra uma nova categoria.

**Body (FormData):**
```javascript
{
  estabelecimento_id: number,
  nome: string,
  imagem: File
}
```

**Nota:** Todas as rotas de categorias estão organizadas junto com as rotas de autenticação em `/api/`.

**Resposta de Sucesso (201):**
```json
{
  "message": "Categoria cadastrada com sucesso!",
  "categoria": {
    "id": 1,
    "estabelecimento_id": 1,
    "nome": "Motor",
    "imagem": "categoria-1234567890-123456789.jpg",
    "status": "Ativo",
    "criado_em": "2024-01-01T00:00:00.000Z"
  }
}
```

**Acesso à Imagem:**
```
GET /uploads/categorias/categoria-1234567890-123456789.jpg
```

### GET `/api/categorias?estabelecimento_id=1`
Lista categorias de um estabelecimento.

**Resposta:**
```json
{
  "categorias": [
    {
      "id": 1,
      "estabelecimento_id": 1,
      "nome": "Motor",
      "imagem": "categoria-1234567890-123456789.jpg",
      "status": "Ativo",
      "criado_em": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### PUT `/api/categorias/:id`
Atualiza uma categoria existente.

### DELETE `/api/categorias/:id`
Remove uma categoria (soft delete).

## Organização das Rotas

Todas as rotas estão centralizadas em `server/routes/AuthRouters.js`:

```javascript
// Rotas de autenticação
router.post('/register', registerUser);
router.post('/login', loginUser);

// Rotas de categorias
router.post('/categorias', upload.single('imagem'), createCategoria);
router.get('/categorias', getCategorias);
router.put('/categorias/:id', updateCategoria);
router.delete('/categorias/:id', deleteCategoria);
```

## Componentes Frontend

### `FormCategory.jsx`
Formulário de cadastro de categorias com:
- Campo de nome com validação
- Upload de imagem com preview
- Validação de arquivos
- Tratamento de erros
- Loading state

### `Categorias.jsx`
Página principal de categorias com:
- Modal para cadastro
- Lista de categorias (a implementar)
- Botão de nova categoria

## Fluxo de Cadastro

1. **Usuário clica em "Nova Categoria"**
   - Modal é aberto
   - Formulário é exibido

2. **Usuário preenche dados**
   - Digita nome da categoria
   - Seleciona imagem (com preview)

3. **Usuário clica em "Salvar"**
   - Validação dos dados
   - Envio para API via FormData
   - Feedback de sucesso/erro

4. **Sucesso**
   - Modal é fechado
   - Formulário é limpo
   - Lista é atualizada (a implementar)

## Validações Implementadas

### Frontend
- Nome obrigatório
- Imagem obrigatória
- Preview da imagem antes do upload
- Validação de formato de arquivo

### Backend
- Estabelecimento ID obrigatório
- Nome obrigatório
- Verificação de estabelecimento ativo
- Nome único por estabelecimento
- Validação de dados de entrada

## Tratamento de Erros

### Erros de Validação
- Nome duplicado
- Estabelecimento não encontrado
- Dados obrigatórios ausentes

### Erros de Sistema
- Erro de conexão
- Erro interno do servidor
- Erro de upload de arquivo

## Upload de Arquivos

### Multer Configuration
- **Destino:** `uploads/categorias/`
- **Nome do arquivo:** `categoria-{timestamp}-{random}.{ext}`
- **Formatos aceitos:** PNG, JPG, JPEG
- **Tamanho máximo:** 5MB
- **Validação:** Apenas arquivos de imagem

### Estrutura de Arquivos
```
server/
├── uploads/
│   └── categorias/
│       ├── categoria-1234567890-123456789.jpg
│       └── categoria-1234567891-987654321.png
└── middleware/
    └── upload.js
```

## Segurança

- Validação de dados no backend
- Verificação de estabelecimento
- Sanitização de entrada
- Transações de banco de dados
- Soft delete para categorias
- Validação de tipos de arquivo
- Limite de tamanho de arquivo

## Próximos Passos

- [ ] Listar categorias existentes
- [ ] Editar categorias
- [ ] Deletar categorias
- [ ] Paginação da lista
- [ ] Filtros e busca
- [ ] Drag & drop para reordenar
