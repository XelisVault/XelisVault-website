#!/bin/bash
set -u
cd /home/z/my-project
setsid bun run dev > /tmp/dev-server.log 2>&1 < /dev/null &
sleep 10
curl -s -o /dev/null -w 'warmup:%{http_code}\n' http://localhost:3000/explorer --max-time 60

agent-browser set viewport 1600 1000
agent-browser open http://localhost:3000/explorer
sleep 24

echo '=== NETWORK SWITCH → TESTNET (correct case) ==='
agent-browser eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'Testnet'); if (b) { b.click(); return 'clicked'; } return 'NO-BTN'; })()" 2>&1 | tail -1
sleep 20
agent-browser eval "(() => document.body.textContent.includes('live · testnet') ? 'badge-testnet-OK' : 'badge-fail')()" 2>&1 | tail -1
agent-browser eval "(() => document.body.textContent.includes('The proving ground') ? 'testnet-copy-OK' : 'copy-fail')()" 2>&1 | tail -1
agent-browser eval "(() => { const btns = Array.from(document.querySelectorAll('button')).filter(b => /^#\d+/.test(b.textContent)); return 'testnet topos: ' + btns.slice(0,3).map(b => b.textContent.match(/#\d+/)[0]).join(' '); })()" 2>&1 | tail -1
agent-browser eval "(() => document.body.textContent.includes('Assets Registry') || document.body.textContent.includes('Asset Registry') ? 'assets-ok' : 'assets-fail')()" 2>&1 | tail -1
agent-browser screenshot /tmp/qa3-testnet.png

echo '=== BACK → MAINNET ==='
agent-browser eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'Mainnet'); if (b) { b.click(); return 'clicked'; } return 'NO-BTN'; })()" 2>&1 | tail -1
sleep 20
agent-browser eval "(() => document.body.textContent.includes('live · mainnet') ? 'badge-mainnet-OK' : 'badge-fail')()" 2>&1 | tail -1
agent-browser eval "(() => { const btns = Array.from(document.querySelectorAll('button')).filter(b => /^#\d+/.test(b.textContent)); return 'mainnet topos: ' + btns.slice(0,2).map(b => b.textContent.match(/#\d+/)[0]).join(' '); })()" 2>&1 | tail -1

echo '=== CINEMA MODE via real click ==='
agent-browser snapshot -i 2>/dev/null | rg -i 'cinema' | head -2
CIN_REF=$(agent-browser snapshot -i --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); els=d.get('elements',d) if isinstance(d,dict) else d; import re; [print(e.get('ref','')) for e in (els if isinstance(els,list) else []) if 'inema' in str(e.get('title','')) + str(e.get('name','')) + str(e.get('label',''))]" 2>/dev/null | head -1)
echo "cinema ref: $CIN_REF"
if [ -n "$CIN_REF" ]; then
  agent-browser scrollintoview "$CIN_REF" > /dev/null 2>&1
  agent-browser click "$CIN_REF" 2>&1 | tail -1
  sleep 3
  agent-browser eval "(() => !!document.fullscreenElement ? 'FULLSCREEN-ACTIVE' : 'fullscreen-inactive')()" 2>&1 | tail -1
  agent-browser screenshot /tmp/qa3-cinema.png
  agent-browser eval "(() => { document.exitFullscreen(); return 'exited'; })()" > /dev/null 2>&1
  sleep 2
else
  echo 'ref not found — trying eval with trusted click via CDP'
fi

echo '=== ERRORS ==='
agent-browser errors | head -6
echo '=== DONE ==='
