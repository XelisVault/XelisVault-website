#!/bin/bash
# QA script: starts dev server, runs browser tests, screenshots, then cleans up.
set -u
cd /home/z/my-project

# start server
setsid bun run dev > /tmp/dev-server.log 2>&1 < /dev/null &
sleep 10
curl -s -o /dev/null -w 'warmup:%{http_code}\n' http://localhost:3000/explorer --max-time 60

echo '=== OPEN PAGE (desktop 1600x1000) ==='
agent-browser set viewport 1600 1000
agent-browser open http://localhost:3000/explorer
sleep 25   # wait for bootstrap + live blocks

echo '=== ERRORS / CONSOLE ==='
agent-browser errors | head -20
agent-browser console | tail -15

echo '=== SNAPSHOT HEAD ==='
agent-browser snapshot -c -d 6 2>/dev/null | head -60

echo '=== SCREENSHOT desktop (2D) ==='
agent-browser screenshot /tmp/qa-desktop-2d.png --full

echo '=== SWITCH TO 3D ==='
agent-browser find text "3d" click 2>&1 | tail -1
sleep 6
agent-browser screenshot /tmp/qa-desktop-3d.png

echo '=== 3D CANVAS PRESENT? ==='
agent-browser eval "!!document.querySelector('canvas')" 2>&1 | tail -1
agent-browser eval "document.querySelectorAll('canvas').length" 2>&1 | tail -1

echo '=== LIVE DATA CHECK ==='
agent-browser eval "document.body.innerText.includes('Mainnet') ? 'has-mainnet' : 'NO-MAINNET'" 2>&1 | tail -1
agent-browser eval "document.body.innerText.match(/live · (mainnet|testnet)/) ? document.body.innerText.match(/live · \w+/)[0] : 'NO-BADGE'" 2>&1 | tail -1
agent-browser eval "document.querySelector('#obs-search') ? 'search-ok' : 'NO-SEARCH'" 2>&1 | tail -1

echo '=== PAGE SECTIONS CHECK ==='
for label in "Miner Arena" "Sealing Chamber" "Difficulty Pressure" "Block Cadence" "Witness Achievements" "Asset Registry" "Network Pulse" "Mempool Radar" "Peer Constellation" "Sealed by Design" "Block Stream"; do
  agent-browser eval "document.body.innerText.includes('$label') ? 'OK: $label' : 'MISSING: $label'" 2>&1 | tail -1
done

echo '=== SEARCH TEST (topoheight) ==='
agent-browser eval "window.__topo = null; fetch('https://node.xelis.io/json_rpc', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({jsonrpc:'2.0',id:1,method:'get_topoheight'})}).then(r=>r.json()).then(d=>{window.__topo=d.result})" 2>&1 | tail -1
sleep 3
agent-browser eval "document.getElementById('obs-search').focus(); document.getElementById('obs-search').value = String(window.__topo - 2)" 2>&1 | tail -1
agent-browser press Enter
sleep 5
agent-browser screenshot /tmp/qa-drawer.png
agent-browser eval "document.body.innerText.includes('Block') && document.body.innerText.includes('Miner') ? 'drawer-open' : 'DRAWER-FAIL'" 2>&1 | tail -1
