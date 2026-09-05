#!/bin/bash
# VLM-verify candidates per category: pick the best real photo for a dark
# champagne-on-ink privacy-finance website.
cd /home/z/my-project/scripts/img-search/cand
OUT=../vlm-picks.txt
> $OUT

check() {
  local cat="$1"; shift
  local files="$@"
  echo "=== $cat ===" >> $OUT
  z-ai vision \
    -p "You are selecting a photograph for a dark, luxury 'private banking meets cryptography' website (near-black backgrounds, champagne-gold accents). Photos must be REAL photography, dramatic/moody, high quality, no text/watermarks/logos, not cartoon/illustration/3D-render. Rank these images from best to worst for this use. For each: index, 1-line verdict, 'REAL PHOTO or NOT'. End with 'WINNER: <index>'." \
    $files 2>/dev/null | python3 -c "import sys,json; d=json.loads(sys.stdin.read()[sys.stdin.read.__self__ and 0:]) if False else None" 2>/dev/null || true
}

# simpler: raw stdout, extract content with python
vlm_pick() {
  local cat="$1"; shift
  z-ai vision \
    -p "You are selecting a photograph for a dark, luxury 'private banking meets cryptography' website (near-black backgrounds, champagne-gold accents). Photos must be REAL photography, dramatic/moody, high quality, no text/watermarks/logos, not cartoon/illustration/3D-render. Rank these images from best to worst. For each: index, one-line verdict, 'REAL PHOTO or NOT'. End with line 'WINNER: <index>'." \
    "$@" 2>/dev/null > /tmp/vlm-$cat.json
  echo "=== $cat ===" >> $OUT
  python3 -c "
import json, re
raw = open('/tmp/vlm-$cat.json').read()
i = raw.find('{')
d = json.loads(raw[i:]) if i >= 0 else {}
c = d.get('choices', [{}])[0].get('message', {}).get('content', 'PARSE FAIL')
print(c[:1200])
" >> $OUT
  echo "" >> $OUT
}

vlm_pick vault-door   vault-door-0.jpg vault-door-1.jpg vault-door-2.jpg vault-door-3.jpg
vlm_pick datacenter   datacenter-0.jpg datacenter-1.jpg datacenter-2.jpg
vlm_pick fiber        fiber-0.jpg fiber-1.jpg fiber-2.jpg fiber-3.jpg
vlm_pick boardroom    boardroom-0.jpg boardroom-1.jpg boardroom-2.jpg
vlm_pick clockwork    clockwork-0.jpg clockwork-1.jpg clockwork-2.jpg clockwork-3.jpg
vlm_pick bokeh        bokeh-0.jpeg bokeh-1.jpg bokeh-2.jpg bokeh-3.jpg
vlm_pick metal-texture metal-texture-0.jpg metal-texture-1.jpg metal-texture-2.jpg

cat $OUT
