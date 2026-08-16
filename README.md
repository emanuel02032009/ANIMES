# ANIMES

Sistema gratuito na nuvem para aplicar um filtro estético VHS/CRT (fita
gravada nos anos 90, tocada numa TV de tubo) nos seus episódios de anime e
comprimir o resultado para um tamanho-alvo, pronto para gravar em
pendrive/DVD-R.

- **Como funciona / arquitetura**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Como colocar no ar (Vercel + Cloudflare R2 + Upstash + GitHub Actions,
  tudo em camada gratuita)**: [`docs/SETUP.md`](docs/SETUP.md)

## Estrutura

- `web/` — app Next.js (upload, status dos jobs, download) hospedado na Vercel
- `.github/workflows/transcode.yml` — dispara o processamento via GitHub Actions
- `worker/` — script ffmpeg (filtro VHS/CRT + compressão 2-pass) que roda no worker