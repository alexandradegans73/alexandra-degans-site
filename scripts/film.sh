#!/usr/bin/env bash
# Découpe une vidéo Higgsfield en séquence d'images pour le film piloté par le scroll.
# Usage : scripts/film.sh video-desktop.mp4 [video-mobile.mp4]
set -euo pipefail
SRC="$1"; MOB="${2:-$1}"; FPS="${FPS:-12}"; W="${W:-1600}"; WM="${WM:-810}"
OUT="public/media/film"; rm -rf "$OUT"; mkdir -p "$OUT/desktop" "$OUT/mobile"
ffmpeg -loglevel error -y -i "$SRC" -vf "fps=$FPS,scale=$W:-2:flags=lanczos" -c:v libwebp -quality 72 "$OUT/desktop/f-%04d.webp"
if [ "$MOB" = "$SRC" ]; then
  # Pas de version verticale : recadrage central 3:4 de la version paysage
  ffmpeg -loglevel error -y -i "$SRC" -vf "fps=$FPS,crop=ih*3/4:ih,scale=$WM:-2:flags=lanczos" -c:v libwebp -quality 68 "$OUT/mobile/f-%04d.webp"
else
  ffmpeg -loglevel error -y -i "$MOB" -vf "fps=$FPS,scale=$WM:-2:flags=lanczos" -c:v libwebp -quality 68 "$OUT/mobile/f-%04d.webp"
fi
N=$(ls "$OUT/desktop" | wc -l)
sed -i "s/count: [0-9]*,/count: $N,/" src/data/media.ts
echo "Séquence prête : $N images — $(du -sh "$OUT/desktop" | cut -f1) (ordinateur), $(du -sh "$OUT/mobile" | cut -f1) (téléphone)"
