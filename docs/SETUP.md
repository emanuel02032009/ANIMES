# Setup

Passo a passo para colocar o sistema no ar. Tudo nas camadas gratuitas dos
respectivos serviços.

## 1. Backblaze B2 (armazenamento)

Sem cartão de crédito — só conta com e-mail (pode ser o Gmail).

1. Crie uma conta gratuita em https://www.backblaze.com/sign-up/cloud-storage.
2. Vá em **B2 Cloud Storage → Buckets → Create a Bucket** (ex.: `vhs-anime`,
   privado). Anote a **região** mostrada (ex.: `us-west-004`).
3. Em **Application Keys → Add a New Application Key**, crie uma chave
   restrita a esse bucket, com permissão de leitura e escrita. Anote:
   - `keyID` (equivalente ao Access Key ID)
   - `applicationKey` (equivalente ao Secret Access Key)
4. O endpoint S3-compatível segue o padrão
   `https://s3.<região>.backblazeb2.com` (ex.:
   `https://s3.us-west-004.backblazeb2.com`) — não precisa criar nada, só
   montar essa URL com a região do passo 2.
5. Configure CORS no bucket (necessário para o navegador enviar/baixar
   arquivos direto do B2, contornando a Vercel) — em **Bucket Settings →
   CORS Rules**:

   ```json
   [
     {
       "corsRuleName": "vhs-anime-web",
       "allowedOrigins": ["https://SEU-APP.vercel.app", "http://localhost:3000"],
       "allowedOperations": ["s3_get", "s3_put", "s3_head"],
       "allowedHeaders": ["*"],
       "maxAgeSeconds": 3600
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
   - `STORAGE_ENDPOINT` (ex.: `https://s3.us-west-004.backblazeb2.com`),
     `STORAGE_REGION` (ex.: `us-west-004`), `STORAGE_BUCKET`,
     `STORAGE_ACCESS_KEY_ID` (o `keyID`), `STORAGE_SECRET_ACCESS_KEY` (a
     `applicationKey`)
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
   - `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`,
     `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `GH_PAT` (o token criado no passo 3), `GITHUB_REPO_OWNER=emanuel02032009`,
     `GITHUB_REPO_NAME=animes`
3. Deploy. Depois, volte no bucket B2 (passo 1.5) e ajuste o CORS com a
   URL final `https://SEU-APP.vercel.app`.

## 5. Testar antes de processar a biblioteca inteira

1. Suba **um episódio curto** pela interface.
2. Acompanhe o status até `done` e baixe o resultado.
3. Copie esse único arquivo pro pendrive e teste no DVD player da LG
   antes de processar o resto — é o jeito mais barato de confirmar se o
   formato (MP4/H.264 SD) é compatível com o aparelho, sem gastar tempo
   processando a biblioteca toda primeiro.
