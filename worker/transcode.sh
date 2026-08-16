#!/usr/bin/env bash
# Baixa um episódio do R2, aplica o filtro VHS/CRT + encode 2-pass mirado
# em ~target_ratio do tamanho original, sobe o resultado de volta pro R2
# e mantém o status do job atualizado no Upstash Redis a cada etapa.
#
# Uso: transcode.sh <jobId> <sourceKey> <originalFilename> [targetRatio]
#
# Variáveis de ambiente esperadas:
#   R2_ACCOUNT_ID, R2_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
#   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/bitrate.sh"

JOB_ID="${1:?job id obrigatório}"
SOURCE_KEY="${2:?source key obrigatória}"
ORIGINAL_FILENAME="${3:?nome do arquivo original obrigatório}"
TARGET_RATIO="${4:-0.20}"

: "${R2_ACCOUNT_ID:?}" "${R2_BUCKET:?}"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

status() {
  node "$SCRIPT_DIR/lib/status.mjs" "$JOB_ID" "$@"
}

WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT
trap 'status status=error error="processamento falhou, veja os logs do workflow"' ERR

IN="$WORKDIR/$ORIGINAL_FILENAME"
OUT_NAME="$(basename "${ORIGINAL_FILENAME%.*}").vhs.mp4"
OUT="$WORKDIR/$OUT_NAME"
OUTPUT_KEY="outputs/${JOB_ID}/${OUT_NAME}"

status status=processing stage=download

aws s3 cp "s3://${R2_BUCKET}/${SOURCE_KEY}" "$IN" --endpoint-url "$ENDPOINT"

status status=processing stage=analyze

read -r VIDEO_KBPS AUDIO_KBPS DURATION_S SOURCE_BYTES < <(compute_target_bitrate "$IN" "$TARGET_RATIO")

FILTER="$(cat "$SCRIPT_DIR/filters/vhs-crt.filter")"
X264_OPTS=(-c:v libx264 -preset veryfast -profile:v main -level 3.1 -pix_fmt yuv420p)

status status=processing stage=encode_pass1 videoKbps="$VIDEO_KBPS"

ffmpeg -y -i "$IN" -vf "$FILTER" -an \
  "${X264_OPTS[@]}" \
  -b:v "${VIDEO_KBPS}k" -maxrate "$((VIDEO_KBPS * 3 / 2))k" -bufsize "$((VIDEO_KBPS * 2))k" \
  -pass 1 -passlogfile "$WORKDIR/ffpass" -f mp4 /dev/null

status status=processing stage=encode_pass2

ffmpeg -y -i "$IN" -vf "$FILTER" \
  "${X264_OPTS[@]}" \
  -b:v "${VIDEO_KBPS}k" -maxrate "$((VIDEO_KBPS * 3 / 2))k" -bufsize "$((VIDEO_KBPS * 2))k" \
  -pass 2 -passlogfile "$WORKDIR/ffpass" \
  -c:a aac -b:a "${AUDIO_KBPS}k" -movflags +faststart "$OUT"

status status=processing stage=upload

OUTPUT_BYTES="$(stat -c%s "$OUT")"

aws s3 cp "$OUT" "s3://${R2_BUCKET}/${OUTPUT_KEY}" --endpoint-url "$ENDPOINT"

ACHIEVED_RATIO="$(awk -v o="$OUTPUT_BYTES" -v s="$SOURCE_BYTES" 'BEGIN { printf "%.3f", o / s }')"

status status=done outputKey="$OUTPUT_KEY" outputBytes="$OUTPUT_BYTES" originalBytes="$SOURCE_BYTES" achievedRatio="$ACHIEVED_RATIO"

echo "Concluído: $OUTPUT_KEY (razão alcançada: ${ACHIEVED_RATIO})"
