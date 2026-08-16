# Setup

Passo a passo para colocar o sistema no ar. Tudo nas camadas gratuitas dos
respectivos serviços.

## 1. Cloudflare R2 (armazenamento)

1. Crie uma conta gratuita em https://dash.cloudflare.com e ative o R2.
2. Crie um bucket (ex.: `vhs-anime`).
3. Em **R2 → Manage API Tokens**, crie um token com permissão
   *Object Read & Write* restrita a esse bucket. Anote:
   - Account ID
   - Access Key ID
   - Secret Access Key
4. Configure CORS no bucket (necessário para o navegador enviar/baixar
   arquivos direto do R2, contornando a Vercel):

   ```json
   [
     {
       "AllowedOrigins": ["https://SEU-APP.vercel.app", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```

## 2. Upstash Redis (estado dos jobs)

1. Crie uma conta gratuita em https://upstash.com e um banco Redis
   (região mais próxima).
2. Na aba **REST API**, copie `UPSTASH_REDIS_REST_URL` e
   `UPSTASH_REDIS_REST_TOKEN`.

## 3. GitHub (worker do ffmpeg)

1. Em **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens**, crie um token restrito ao repositório
   `emanuel02032009/animes`, com permissão **Contents: Read and write**.
2. Em **Settings → Secrets and variables → Actions** deste repositório,
   cadastre os secrets usados pelo workflow `.github/workflows/transcode.yml`:
   - `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
3. Mantenha o repositório **privado** (2000 min/mês grátis de Actions já é
   suficiente para uso pessoal). Só considere torná-lo público se algum
   dia estourar esse limite — nenhum vídeo fica versionado no git, só
   código, então não há nada sensível para expor.

## 4. Deploy do app na Vercel

1. Importe o repositório em https://vercel.com/new, apontando o
   **Root Directory** para `web/`.
2. Configure as mesmas variáveis de `web/.env.example` em
   **Settings → Environment Variables**:
   - `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `GH_PAT` (o token criado no passo 3), `GITHUB_REPO_OWNER=emanuel02032009`,
     `GITHUB_REPO_NAME=animes`
3. Deploy. Depois, volte no bucket R2 (passo 1.4) e ajuste o CORS com a
   URL final `https://SEU-APP.vercel.app`.

## 5. Testar antes de processar a biblioteca inteira

1. Suba **um episódio curto** pela interface.
2. Acompanhe o status até `done` e baixe o resultado.
3. Copie esse único arquivo pro pendrive e teste no DVD player da LG
   antes de processar o resto — é o jeito mais barato de confirmar se o
   formato (MP4/H.264 SD) é compatível com o aparelho, sem gastar tempo
   processando a biblioteca toda primeiro.
