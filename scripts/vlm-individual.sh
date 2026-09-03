#!/bin/bash
# VLM check each candidate INDIVIDUALLY: content + real-photo verdict.
cd /home/z/my-project/scripts/img-search/cand
OUT=../vlm-individual.txt
> $OUT

check() {
  local f="$1"
  local desc
  desc=$(z-ai vision -p "One sentence: what does this image show? Then answer strictly on one line: 'REAL: yes' if it is a real photograph (not illustration, 3D render, AI art, or has visible text/watermark), else 'REAL: no'." -i "./$f" 2>/dev/null | python3 -c "
import sys, json
raw = sys.stdin.read()
i = raw.find('{')
try:
    d = json.loads(raw[i:])
    print(d.get('choices',[{}])[0].get('message',{}).get('content','').strip()[:300])
except Exception:
    print('PARSE-FAIL')
")
  echo "$f :: $desc" >> $OUT
}

for f in vault-door-0.jpg vault-door-1.jpg vault-door-2.jpg vault-door-3.jpg datacenter-0.jpg datacenter-1.jpg datacenter-2.jpg fiber-0.jpg fiber-1.jpg fiber-2.jpg fiber-3.jpg; do check "$f" & done
wait
for f in boardroom-0.jpg boardroom-1.jpg boardroom-2.jpg clockwork-0.jpg clockwork-1.jpg clockwork-2.jpg clockwork-3.jpg bokeh-0.jpeg bokeh-1.jpg bokeh-2.jpg bokeh-3.jpg metal-texture-0.jpg metal-texture-1.jpg metal-texture-2.jpg; do check "$f" & done
wait

cat $OUT
