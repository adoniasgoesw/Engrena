import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;

// Carregar variáveis de ambiente se ainda não foram carregadas
// Isso garante que DATABASE_URL esteja disponível mesmo se db.js for importado antes do index.js
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'development' && !process.env.DATABASE_URL) {
  // Tentar carregar .env.dev primeiro, depois .env
  const devResult = dotenv.config({ path: '.env.dev' });
  if (devResult.error) {
    dotenv.config(); // Fallback para .env
  }
}

// Verificar se DATABASE_URL está configurado após carregar dotenv
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não está configurado!');
  console.error('💡 Configure a variável DATABASE_URL no Render ou no arquivo .env/.env.dev');
}

// Pool de conexões otimizado
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('neon.tech') 
    ? { rejectUnauthorized: false } // Necessário para Neon DB e alguns outros serviços
    : undefined,
  // Configurações do Pool
  max: 20, // Máximo de 20 conexões simultâneas
  idleTimeoutMillis: 30000, // Fecha conexões ociosas após 30 segundos
  connectionTimeoutMillis: 60000, // Timeout de 60 segundos para estabelecer conexão
});

// Eventos do pool
pool.on('connect', () => {
  console.log('🟢 Nova conexão ao banco de dados estabelecida!');
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool do banco de dados:', err);
});

pool.on('remove', () => {
  console.log('🔵 Conexão removida do pool');
});

export default pool;
