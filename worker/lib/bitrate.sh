#!/usr/bin/env bash
# Calcula o bitrate de vídeo (kbps) necessário para que o arquivo de saída
# fique em torno de target_ratio do tamanho do arquivo de entrada, dado
# a duração real do vídeo (encode 2-pass por tamanho-alvo, não CRF).
#
# Uso: read -r VIDEO_KBPS AUDIO_KBPS DURATION_S SOURCE_BYTES < <(compute_target_bitrate input.mkv 0.20)
set -euo pipefail

AUDIO_KBPS_DEFAULT=128
MIN_VIDEO_KBPS=500
MAX_VIDEO_KBPS=2500

compute_target_bitrate() {
  local input="$1"
  local target_ratio="${2:-0.20}"
  local audio_kbps="${3:-$AUDIO_KBPS_DEFAULT}"

  local duration_s
  duration_s=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$input")

  local source_bytes
  source_bytes=$(stat -c%s "$input")

  local target_bytes
  target_bytes=$(awk -v s="$source_bytes" -v r="$target_ratio" 'BEGIN { printf "%.0f", s * r }')

  # 2% de folga para overhead de mux (container/índices).
  local target_kbps
  target_kbps=$(awk -v b="$target_bytes" -v d="$duration_s" \
    'BEGIN { printf "%.0f", (b * 8 / 1000 * 0.98) / d }')

  local video_kbps=$((target_kbps - audio_kbps))
  if [ "$video_kbps" -lt "$MIN_VIDEO_KBPS" ]; then
    video_kbps=$MIN_VIDEO_KBPS
  elif [ "$video_kbps" -gt "$MAX_VIDEO_KBPS" ]; then
    video_kbps=$MAX_VIDEO_KBPS
  fi

  echo "$video_kbps $audio_kbps $duration_s $source_bytes"
}
