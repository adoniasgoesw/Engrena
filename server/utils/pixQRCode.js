import bwipjs from 'bwip-js'

// Gerar QR Code Pix (formato EMV)
export const gerarQRCodePix = async (chavePix, valor, descricao = '') => {
  try {
    // Formato EMV para Pix
    // Estrutura: 00020126... (código EMV completo)
    // Para teste, vamos usar um formato simplificado
    // Em produção, você deve usar a API do seu banco para gerar o QR Code Pix real
    
    // Montar payload Pix (formato simplificado para teste)
    // Em produção, use a API do banco (ex: Banco do Brasil, Itaú, etc.)
    const payload = `00020126${chavePix.length.toString().padStart(2, '0')}${chavePix}52040000530398654${valor.toFixed(2).replace('.', '')}5802BR59${descricao.length.toString().padStart(2, '0')}${descricao}6008BRASILIA62070503***6304`
    
    // Calcular CRC16 (simplificado - em produção use a função correta)
    const crc = 'ABCD' // Placeholder - em produção calcule o CRC16 correto
    const emvCode = payload + crc
    
    // Gerar QR Code usando bwip-js
    const qrCodeBuffer = await bwipjs.toBuffer({
      bcid: 'qrcode', // Tipo: QR Code
      text: emvCode,
      scale: 3, // Tamanho do QR Code
      height: 10,
      width: 10,
      includetext: false,
      textxalign: 'center'
    })
    
    return qrCodeBuffer
  } catch (error) {
    console.error('Erro ao gerar QR Code Pix:', error)
    throw error
  }
}

// Função auxiliar para gerar QR Code simples (para teste)
// Em produção, substitua por integração com API do banco
export const gerarQRCodePixSimples = async (chavePix, valor) => {
  try {
    // Para teste, vamos gerar um QR Code com a chave e valor
    // Em produção, use a API do banco para gerar o QR Code Pix real
    const textoQR = `PIX:${chavePix}|VALOR:${valor.toFixed(2)}`
    
    const qrCodeBuffer = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: textoQR,
      scale: 4,
      height: 10,
      width: 10,
      includetext: false
    })
    
    return qrCodeBuffer
  } catch (error) {
    console.error('Erro ao gerar QR Code Pix simples:', error)
    throw error
  }
}

