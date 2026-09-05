#!/bin/bash
# Fetch a batch of premium "private bank" images for the Xelis Vault reskin
# Usage: bash /home/z/my-project/scripts/fetch-images.sh
set -u
OUT=/tmp/imgs
mkdir -p "$OUT"

fetch() {
  local name="$1"; shift
  local query="$1"; shift
  echo ">>> [$name] $query"
  z-ai image-search -q "$query" --count 5 --gl us --no-rank > "$OUT/$name.raw" 2>/dev/null
  # strip lines before the JSON object
  python3 - "$OUT/$name.raw" "$OUT/$name.json" <<'EOF'
import json, sys
raw = open(sys.argv[1]).read()
start = raw.find('{')
data = json.loads(raw[start:]) if start >= 0 else {}
json.dump(data, open(sys.argv[2], 'w'))
print('  ok:', data.get('count'), 'images')
EOF
}

fetch alps2 "swiss alps mountain peak golden hour dramatic clouds"
fetch vault "massive steel bank vault door dark metal"
fetch watch "watchmaker assembling luxury watch macro precision hands"
fetch gold "stacked gold bars dark elegant background"
fetch arch "modern glass skyscraper financial district upward view"
fetch marble "dark marble stone texture elegant abstract"
fetch handshake "professional business handshake dark suit elegant"
fetch lake "alpine lake reflection mountains minimal"

echo "ALL DONE"
