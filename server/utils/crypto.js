import crypto from 'crypto'

// Chave de criptografia - em produção, deve vir de variável de ambiente
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32-chars!!'
const ALGORITHM = 'aes-256-cbc'

// Garantir que a chave tenha 32 bytes
const getKey = () => {
  return crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
}

// Criptografar texto
export const encrypt = (text) => {
  if (!text) return null
  
  try {
    const key = getKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Retornar IV + texto criptografado (IV é necessário para descriptografar)
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Erro ao criptografar:', error)
    throw new Error('Erro ao criptografar dados')
  }
}

// Descriptografar texto
export const decrypt = (encryptedText) => {
  if (!encryptedText) return null
  
  try {
    const key = getKey()
    const parts = encryptedText.split(':')
    
    if (parts.length !== 2) {
      throw new Error('Formato de texto criptografado inválido')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Erro ao descriptografar:', error)
    throw new Error('Erro ao descriptografar dados')
  }
}




