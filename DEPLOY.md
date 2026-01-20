# Guia de Deploy no Vercel

Seu projeto está totalmente configurado para deploy no Vercel. Siga este guia passo a passo.

## 1. Preparação do Código
O projeto já contém as configurações necessárias:
- `vercel.json`: Configurado para roteamento de SPA (Single Page Application).
- `vite.config.ts`: Configurado para build de produção.
- `package.json`: Scripts de build prontos.

## 2. Configurações no Painel da Vercel

Ao importar seu repositório git no Vercel (https://vercel.com/new):

1.  **Framework Preset**: Vite (deve ser detectado automaticamente).
2.  **Root Directory**: `./` (raiz do projeto).
3.  **Build Command**: `vite build` ou `npm run build`.
4.  **Output Directory**: `dist`.

## 3. Variáveis de Ambiente (CRÍTICO)

Você **DEVE** configurar as seguintes variáveis de ambiente na seção "Environment Variables" do projeto na Vercel para que a aplicação funcione:

| Nome da Variável | Descrição | Onde encontrar o valor |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase | Arquivo `.env` local ou Painel Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase | Arquivo `.env` local ou Painel Supabase |
| `GEMINI_API_KEY` | Chave da API do Google Gemini | Arquivo `.env` local ou Google AI Studio (se utilizada) |

> **Nota**: Se você não estiver usando funcionalidades de IA no frontend que dependam da `GEMINI_API_KEY`, você pode ignorá-la, mas configure as do Supabase obrigatoriamente.

## 4. Teste de Build
Antes de fazer o push, você pode garantir que o build está passando localmente:
```bash
npm run build
```
Se o comando terminar com "✓ built in...", o projeto está saudável.

## 5. Próximos Passos
1. Faça commit e push de todas as alterações para o seu repositório remoto (GitHub/GitLab).
   ```bash
   git add .
   git commit -m "Preparação final para deploy"
   git push origin main
   ```
2. O Vercel detectará o push e iniciará o deploy automaticamente.
3. Acompanhe o log de build no painel da Vercel.
