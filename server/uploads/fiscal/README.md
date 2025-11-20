# Pasta Fiscal

Esta pasta é destinada ao armazenamento de arquivos fiscais relacionados às notas fiscais eletrônicas.

## Estrutura

```
fiscal/
├── xml/        # Arquivos XML das notas fiscais eletrônicas (NFe)
├── pdf/        # PDFs das notas fiscais (DANFE)
└── outros/     # Outros documentos fiscais (cancelamentos, inutilizações, etc.)
```

## Uso

Os arquivos fiscais devem ser salvos nesta estrutura seguindo a convenção de nomenclatura:

- **XML**: `nfe-{chave_acesso}.xml` ou `nfe-{numero}-{serie}.xml`
- **PDF**: `danfe-{id_pagamento}.pdf` ou `danfe-{chave_acesso}.pdf`
- **Outros**: Conforme necessário

## Exemplo de uso no código

```javascript
import path from 'path';
import fs from 'fs';

const fiscalPath = path.join(process.cwd(), 'server', 'uploads', 'fiscal');
const xmlPath = path.join(fiscalPath, 'xml');
const pdfPath = path.join(fiscalPath, 'pdf');

// Garantir que as pastas existam
if (!fs.existsSync(xmlPath)) fs.mkdirSync(xmlPath, { recursive: true });
if (!fs.existsSync(pdfPath)) fs.mkdirSync(pdfPath, { recursive: true });
```

