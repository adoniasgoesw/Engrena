import cloudinary from './config/cloudinary.js';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configuração do Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'engrena/categorias',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `categoria-${uniqueSuffix}`;
    }
  }
});

const upload = multer({ storage: storage });

// Testar upload direto
const testDirectUpload = async () => {
  try {
    console.log('Testando upload direto...');
    
    const result = await cloudinary.uploader.upload(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      {
        folder: 'engrena/categorias',
        public_id: 'teste-categoria-' + Date.now(),
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
          { quality: 'auto' }
        ]
      }
    );
    
    console.log('✅ Upload direto bem-sucedido!');
    console.log('URL:', result.secure_url);
    console.log('Public ID:', result.public_id);
    
    return result.secure_url;
  } catch (error) {
    console.error('❌ Erro no upload direto:', error);
    return null;
  }
};

testDirectUpload();





