import pkg from 'pg';

const { Pool } = pkg;

// Verificar se DATABASE_URL está configurado
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não está configurado!');
  console.error('💡 Configure a variável DATABASE_URL no Render ou no arquivo .env');
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
