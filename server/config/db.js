import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Pool de conexões otimizado
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necessário para Neon DB
  },
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
