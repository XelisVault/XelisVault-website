#!/bin/bash
# VLM QA of the production /antumbra screenshots.
for v in top mid; do
  desc=$(z-ai vision -p "This is a screenshot of the ANTUMBRA blockchain teaser page (dark navy and gold). Check strictly: 1) Any visual defects: overlapping text, broken layout, misaligned elements, cut-off content? 2) Is the whitepaper download button/link visible and intact? 3) Does it look professional? Answer in 3 short lines." -i "/tmp/qa-antumbra-prod-${v}.png" 2>/dev/null | python3 -c "
import sys, json
raw = sys.stdin.read()
i = raw.find('{')
try:
    d = json.loads(raw[i:])
    print(d.get('choices',[{}])[0].get('message',{}).get('content','').strip()[:400])
except Exception:
    print('PARSE-FAIL', raw[:100])
")
  echo "${v}: ${desc}"
  echo "---"
done
