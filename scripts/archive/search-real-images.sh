#!/bin/bash
# Search real (non-AI) photos for all 7 image slots, in parallel.
# Captures CLI stdout (JSON) to files under scripts/img-search/raw/
cd /home/z/my-project
mkdir -p scripts/img-search/raw
cd scripts/img-search/raw

run() {
  local name="$1"; local query="$2"
  z-ai image-search -q "$query" --count 6 --gl us --no-rank > "$name.raw.txt" 2>&1
  # strip progress lines: keep from first '{'
  awk 'flag{print} /^\{/{flag=1; print}' "$name.raw.txt" > "$name.json" 2>/dev/null || true
}

run vault-door    "massive circular bank vault door in a dark room, dramatic lighting" &
run datacenter    "dark data center server room with rows of glowing servers" &
run fiber         "glowing fiber optic cables in darkness macro photography" &
wait
run boardroom     "dark modern corporate boardroom empty table dramatic light" &
run clockwork     "macro photo of precision brass clockwork gears in dark tones" &
run bokeh         "warm golden bokeh lights on dark black background" &
wait
run metal-texture "dark brushed metal steel texture background" &
wait

echo "=== DONE ==="
for f in *.json; do
  n=$(grep -c '"original_url"' "$f" 2>/dev/null || echo 0)
  echo "$f: $n results"
done
