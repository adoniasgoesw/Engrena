import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import AuthRouters from './routes/AuthRouters.js';
import pool from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
// Em produção (Render), as variáveis vêm do painel de configuração
// Em desenvolvimento, carrega do arquivo .env.dev
// Em produção local, pode carregar do .env.prod
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'development') {
  // Tentar carregar .env.dev primeiro, depois .env como fallback
  const devResult = dotenv.config({ path: '.env.dev' });
  if (devResult.error) {
    // Se .env.dev não existir, tenta .env
    dotenv.config();
    console.log('📝 Modo desenvolvimento: carregando .env');
  } else {
    console.log('📝 Modo desenvolvimento: carregando .env.dev');
  }
} else {
  // Em produção, tentar carregar .env.prod se existir (útil para testes locais)
  // No Render, as variáveis vêm do painel, mas .env.prod pode ser útil
  const prodResult = dotenv.config({ path: '.env.prod' });
  if (prodResult.error) {
    console.log('🚀 Modo produção: usando variáveis de ambiente do sistema (Render)');
  } else {
    console.log('🚀 Modo produção: carregando .env.prod (variáveis do sistema têm prioridade)');
  }
}

const app = express();
const PORT = process.env.PORT || 3002;

// Configurar CORS - aceitar múltiplas origens
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://engrena-sistema-de-gestao.onrender.com',
  'https://engrena.netlify.app', // Frontend em produção no Netlify
  process.env.RENDER_EXTERNAL_URL
].filter(Boolean); // Remove valores undefined/null

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      // Em desenvolvimento, permitir qualquer origem
      callback(null, true);
    } else {
      // Em produção, logar mas permitir para evitar bloqueios
      console.warn(`⚠️  CORS: origem não configurada: ${origin}`);
      console.warn(`💡 Adicione ${origin} à variável FRONTEND_URL ou à lista allowedOrigins`);
      callback(null, true); // Permitir para não quebrar o sistema
    }
  },
  credentials: true
}));
app.use(express.json());

// Servir arquivos estáticos (imagens)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas
app.use('/api/auth', AuthRouters);

// Teste de conexão com DB
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ db_time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro no banco de dados' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: nodeEnv,
    port: PORT
  });
});

// Inicialização do servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Ambiente: ${nodeEnv}`);
  console.log(`🌐 Backend URL: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
  console.log(`🎨 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔐 DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurado' : '❌ NÃO CONFIGURADO'}`);
  console.log(`🌍 CORS Origins permitidas: ${allowedOrigins.join(', ')}`);
  
  // Testar conexão com o banco de dados
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexão com banco de dados estabelecida:', result.rows[0].now);
  } catch (err) {
    console.error('❌ Erro ao conectar com banco de dados:', err.message);
    console.error('💡 Verifique se DATABASE_URL está configurado corretamente');
  }
});