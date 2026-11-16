#!/usr/bin/env bash
# Make a thumbnail storyboard (sprite sheet + VTT) for the seek preview card.
# Usage: scripts/make-storyboard.sh public/media/film.mp4 [interval_seconds] [image_url]
# Writes storyboard.jpg and thumbnails.vtt next to the video: 192x108 tiles, 8 per row.
# image_url is written into the VTT relative to the VTT itself (the WebVTT
# convention); the skin makes it absolute where a media element needs it.
set -euo pipefail
in="$1"; step="${2:-2}"; url="${3:-storyboard.jpg}"; dir="$(dirname "$in")"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
n=$(python3 -c "import math; print(math.ceil($dur/$step))")
rows=$(( (n + 7) / 8 ))
ffmpeg -v error -y -i "$in" -vf "fps=1/$step,scale=192:108:flags=lanczos,tile=8x$rows" -frames:v 1 -q:v 4 "$dir/storyboard.jpg"
python3 - "$dur" "$step" "$n" "$url" > "$dir/thumbnails.vtt" <<'PY'
import sys
dur, step, n, url = float(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
ts = lambda t: f"{int(t//3600):02d}:{int(t%3600//60):02d}:{t%60:06.3f}"
print("WEBVTT\n")
for j in range(n):
    a = j * step; b = min(dur, a + step)
    print(f"{ts(a)} --> {ts(b)}\n{url}#xywh={(j%8)*192},{(j//8)*108},192,108\n")
PY
echo "wrote $dir/storyboard.jpg and $dir/thumbnails.vtt ($n tiles)"
