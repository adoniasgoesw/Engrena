import cloudinary from './config/cloudinary.js';
import pool from './config/db.js';
import fs from 'fs';
import path from 'path';

const uploadExistingImages = async () => {
  try {
    console.log('Fazendo upload das imagens existentes...');
    
    // Buscar categorias com imagens locais
    const result = await pool.query(`
      SELECT id, imagem 
      FROM categorias 
      WHERE imagem IS NOT NULL 
      AND imagem LIKE 'categoria-%'
    `);
    
    console.log(`Encontradas ${result.rows.length} categorias para fazer upload`);
    
    for (const categoria of result.rows) {
      const imagePath = path.join('uploads', 'categorias', categoria.imagem);
      
      // Verificar se o arquivo existe
      if (fs.existsSync(imagePath)) {
        try {
          // Fazer upload para Cloudinary
          const uploadResult = await cloudinary.uploader.upload(imagePath, {
            folder: 'engrena/categorias',
            public_id: categoria.imagem.replace('.webp', ''),
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
              { quality: 'auto' }
            ]
          });
          
          // Atualizar no banco com a URL do Cloudinary
          await pool.query(
            'UPDATE categorias SET imagem = $1 WHERE id = $2',
            [uploadResult.secure_url, categoria.id]
          );
          
          console.log(`✅ Upload bem-sucedido para categoria ${categoria.id}:`);
          console.log(`   URL: ${uploadResult.secure_url}`);
          
          // Remover arquivo local após upload
          fs.unlinkSync(imagePath);
          console.log(`   Arquivo local removido: ${imagePath}`);
          
        } catch (uploadError) {
          console.error(`❌ Erro no upload da categoria ${categoria.id}:`, uploadError.message);
        }
      } else {
        console.log(`⚠️ Arquivo não encontrado: ${imagePath}`);
      }
    }
    
    console.log('✅ Processo de upload concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await pool.end();
  }
};

uploadExistingImages();





