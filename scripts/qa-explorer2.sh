#!/bin/bash
# QA part 2: scroll reveals, 3D mode, network switch, cinema mode, mobile.
set -u
cd /home/z/my-project

setsid bun run dev > /tmp/dev-server.log 2>&1 < /dev/null &
sleep 10
curl -s -o /dev/null -w 'warmup:%{http_code}\n' http://localhost:3000/explorer --max-time 60

agent-browser set viewport 1600 1000
agent-browser open http://localhost:3000/explorer
sleep 22

echo '=== SCROLL THROUGH PAGE (trigger reveals) ==='
for y in 600 1200 1800 2400 3000 3600 4200 4800; do
  agent-browser eval "window.scrollTo(0, $y)" > /dev/null 2>&1
  sleep 0.6
done
sleep 2

echo '=== SECTIONS CHECK (textContent, visibility-independent) ==='
for label in "Miner Arena" "Sealing Chamber" "Difficulty Pressure" "Block Cadence" "Witness Achievements" "Asset Registry" "Network Pulse" "Mempool Radar" "Peer Constellation" "Sealed by Design" "Block Stream" "Official mainnet explorer" "awaiting in mempool" "sealed this session" "mining · last"; do
  agent-browser eval "document.body.textContent.includes('$label') ? 'OK: $label' : 'MISSING: $label'" 2>&1 | tail -1
done

echo '=== MINER ARENA CONTENT ==='
agent-browser eval "Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('XET earned')).length + ' miner rows with rewards'" 2>&1 | tail -1

echo '=== ACHIEVEMENTS COUNT ==='
agent-browser eval "document.body.textContent.match(/\d+\/9 · \d+%/) ? document.body.textContent.match(/\d+\/9 · \d+%/)[0] : 'not-found'" 2>&1 | tail -1

echo '=== ASSETS COUNT ==='
agent-browser eval "(document.body.textContent.match(/(\d+) assets live/) || [])[1] || 'no-assets-count'" 2>&1 | tail -1

echo '=== FULL PAGE SCREENSHOT ==='
agent-browser scroll up 600 > /dev/null 2>&1
agent-browser eval "window.scrollTo(0,0)" > /dev/null 2>&1
sleep 1
agent-browser screenshot /tmp/qa-desktop-full.png --full

echo '=== 3D MODE ==='
agent-browser eval "document.querySelector('[title*=3D]') || document.querySelectorAll('button').find(b => b.textContent.trim() === '3d')" > /dev/null 2>&1
agent-browser eval "const btns = Array.from(document.querySelectorAll('button')); const b = btns.find(x => x.textContent.trim() === '3d'); b ? b.click() : 'NO-3D-BTN'" 2>&1 | tail -1
sleep 7
agent-browser eval "document.querySelectorAll('canvas').length + ' canvases (3D mode)'" 2>&1 | tail -1
agent-browser screenshot /tmp/qa-3d.png

echo '=== CINEMA MODE (fullscreen) ==='
agent-browser eval "const btns = Array.from(document.querySelectorAll('button')); const b = btns.find(x => (x.title || '').includes('Cinema')); b ? b.click() : 'NO-CINEMA-BTN'" 2>&1 | tail -1
sleep 3
agent-browser eval "!!document.fullscreenElement ? 'fullscreen-active' : 'fullscreen-inactive'" 2>&1 | tail -1
agent-browser screenshot /tmp/qa-cinema.png
agent-browser eval "document.exitFullscreen()" > /dev/null 2>&1
sleep 2

echo '=== NETWORK SWITCH → TESTNET ==='
agent-browser eval "window.scrollTo(0,0)" > /dev/null 2>&1
agent-browser eval "const btns = Array.from(document.querySelectorAll('button')); const b = btns.find(x => x.textContent.trim() === 'TESTNET'); b ? b.click() : 'NO-TESTNET-BTN'" 2>&1 | tail -1
sleep 18
agent-browser eval "document.body.textContent.includes('live · testnet') || document.body.textContent.toUpperCase().includes('LIVE · TESTNET') ? 'testnet-badge-ok' : document.body.textContent.slice(0,300)" 2>&1 | tail -1
agent-browser eval "document.body.textContent.match(/The proving ground/) ? 'testnet-copy-ok' : 'testnet-copy-missing'" 2>&1 | tail -1
agent-browser screenshot /tmp/qa-testnet.png

echo '=== SWITCH BACK → MAINNET ==='
agent-browser eval "const btns = Array.from(document.querySelectorAll('button')); const b = btns.find(x => x.textContent.trim() === 'MAINNET'); b ? b.click() : 'NO-MAINNET-BTN'" 2>&1 | tail -1
sleep 18
agent-browser eval "document.body.textContent.includes('mainnet') ? 'back-on-mainnet' : 'STILL-TESTNET?'" 2>&1 | tail -1

echo '=== FINAL ERRORS ==='
agent-browser errors | head -10
agent-browser console | rg -i 'error|warn' | head -10

echo '=== MOBILE TEST (390x844) ==='
agent-browser set viewport 390 844
agent-browser reload
sleep 22
agent-browser eval "window.scrollTo(0, 800)" > /dev/null 2>&1; sleep 1
agent-browser eval "document.documentElement.scrollWidth <= 391 + 1 ? 'no-h-overflow' : 'H-OVERFLOW: ' + document.documentElement.scrollWidth" 2>&1 | tail -1
agent-browser screenshot /tmp/qa-mobile.png --full

echo '=== DONE ==='
