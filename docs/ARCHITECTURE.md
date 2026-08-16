# Arquitetura

Sistema gratuito para aplicar um filtro estético VHS/CRT em episódios de
anime e comprimi-los para um tamanho-alvo, sem depender de acesso direto
ao seu PC.

```
navegador (upload/download) ──► Cloudflare R2 (arquivos)
        │                              ▲
        │ cria job / confirma upload   │ download/upload direto
        ▼                              │
   Next.js na Vercel ──dispatch──► GitHub Actions (ffmpeg)
        ▲                              │
        └──────── polling de status ───┘
                Upstash Redis (estado dos jobs)
```

- **Web (`/web`)**: Next.js hospedado na Vercel. Só orquestra — nunca recebe
  os bytes do vídeo (limite de 4.5MB por requisição em funções serverless
  da Vercel tornaria isso inviável). Gera URLs pré-assinadas do R2 para o
  navegador enviar/baixar os arquivos diretamente.
- **Armazenamento (Cloudflare R2)**: bucket S3-compatível, 10GB grátis,
  sem custo de egress. Guarda originais em `uploads/<jobId>/<arquivo>` e
  resultados em `outputs/<jobId>/<arquivo>`.
- **Worker (`/worker` + `.github/workflows/transcode.yml`)**: disparado via
  `repository_dispatch` quando o upload é confirmado. Roda num runner do
  GitHub Actions (4 vCPU/16GB, timeout de 6h — necessário porque o filtro
  `geq` por pixel é pesado de CPU e as funções da Vercel não aguentariam).
- **Estado dos jobs (Upstash Redis)**: um registro JSON por job em
  `job:<id>`, mais um índice `jobs:index`. O worker escreve o status a
  cada etapa (`processing` → `done`/`error`); a página web só faz
  polling desse registro.

## Filtro VHS/CRT corrigido

O script original (`converter.bat`) tinha um bug: o efeito de scanline era
escrito no canal **alpha** do `geq`, mas o pipeline converte pra `yuv420p`
(sem alpha) antes de codificar — o canal é descartado sem nunca ser
composto com nada, então o efeito não aparecia no resultado final.

Filtro corrigido, em `worker/filters/vhs-crt.filter`:

```
scale=720:480:flags=fast_bilinear,
eq=contrast=1.1:brightness=-0.03:saturation=0.88,
chromashift=cbh=3:crh=-3,
noise=alls=22:allf=t+u,
format=yuv420p,
geq=lum='lum(X,Y)*(0.85+0.15*mod(Y,2))':cb='cb(X,Y)':cr='cr(X,Y)'
```

Agora o fator de linha alternada é aplicado direto na luminância (efeito
realmente visível), e `cb`/`cr` são passthrough explícito — necessário
porque, se omitidos, o `geq` do ffmpeg reaproveita a expressão de `lum`
nos planos de crominância por padrão, corrompendo a cor.

## Compressão por tamanho-alvo (não CRF)

Como o pedido é "reduzir X% do tamanho", não uma qualidade fixa, o worker
usa encode 2-pass com bitrate calculado (`worker/lib/bitrate.sh`):

```
target_bytes = tamanho_original * target_ratio
target_kbps  = (target_bytes * 8 / 1000 * 0.98) / duração_segundos
video_kbps   = target_kbps - 128 (áudio AAC), limitado a [500, 2500] kbps
```

Se o resultado parecer com qualidade fraca no tamanho-alvo escolhido, o
primeiro ajuste é reduzir `noise=alls=22` (ex.: para 12) em
`vhs-crt.filter` antes de mexer no bitrate — o ruído sintético consome
parte do orçamento de bits que poderia ir para o conteúdo real da cena.

## Fora de escopo (por enquanto)

- **Gravar o pendrive/DVD-R**: nem Vercel nem GitHub Actions têm acesso a
  hardware físico. O pipeline entrega o `.mp4` pronto para download; gravar
  no pendrive ou disco continua sendo uma etapa manual local.
- **Autoria de DVD-Vídeo (VOB/IFO)**: o padrão atual é MP4/H.264 em SD,
  igual ao script original, compatível com tocadores DivX-certificados via
  USB. Autoria de DVD-Vídeo de verdade (`dvdauthor`) é um possível
  próximo passo, não incluída nesta primeira versão.
