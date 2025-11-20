# Configuração de Envio de Email

Para que o sistema possa enviar emails com PDFs das ordens de serviço, é necessário configurar as variáveis de ambiente SMTP no arquivo `.env` do servidor.

## Passo a Passo

### 1. Criar/Editar arquivo `.env` na pasta `server/`

Crie um arquivo chamado `.env` na raiz da pasta `server/` (se ainda não existir) e adicione as seguintes variáveis:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
```

### 2. Configuração para Gmail

Se você usar Gmail:

1. **Ative a verificação em duas etapas** na sua conta Google:
   - Acesse: https://myaccount.google.com/security
   - Ative "Verificação em duas etapas"

2. **Gere uma "App Password"**:
   - Acesse: https://myaccount.google.com/apppasswords
   - Selecione "App" e escolha "Email"
   - Selecione "Dispositivo" e escolha "Outro (nome personalizado)"
   - Digite "Engrena Sistema" e clique em "Gerar"
   - **Copie a senha gerada** (16 caracteres sem espaços)
   - Use essa senha no `SMTP_PASS`

3. **Configure no `.env`**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu-email@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop
   ```
   (Remova os espaços da senha gerada)

### 3. Configuração para Outlook/Office 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=seu-email@outlook.com
SMTP_PASS=sua-senha
```

### 4. Configuração para Yahoo

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=seu-email@yahoo.com
SMTP_PASS=sua-senha-app
```

### 5. Reiniciar o Servidor

Após configurar as variáveis, **reinicie o servidor** para que as mudanças tenham efeito:

```bash
# Pare o servidor (Ctrl+C) e inicie novamente
npm start
# ou
node index.js
```

## Verificação

Após configurar, teste o envio de email através do botão "Enviar por Email" na página de detalhes da ordem.

## Importante

- O email do **remetente** será o email do usuário logado (ou do administrador se o usuário não tiver email)
- As **credenciais SMTP** (`SMTP_USER` e `SMTP_PASS`) devem ser de uma conta de email válida configurada no servidor
- O `SMTP_USER` pode ser diferente do email do remetente, mas deve ser uma conta válida com permissão para enviar emails

## Troubleshooting

### Erro: "Serviço de email não configurado"
- Verifique se o arquivo `.env` existe na pasta `server/`
- Verifique se as variáveis estão escritas corretamente (sem espaços extras)
- Reinicie o servidor após adicionar/modificar as variáveis

### Erro: "Invalid login" ou "Authentication failed"
- Para Gmail: certifique-se de usar uma "App Password" e não a senha normal
- Verifique se a verificação em duas etapas está ativada (Gmail)
- Verifique se o email e senha estão corretos

### Erro: "Connection timeout"
- Verifique se a porta está correta (587 para TLS, 465 para SSL)
- Verifique se o firewall não está bloqueando a conexão
- Tente usar `SMTP_PORT=465` e `secure: true` (requer alteração no código)

