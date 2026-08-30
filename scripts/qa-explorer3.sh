#!/bin/bash
set -u
cd /home/z/my-project
npx eslint src/components/explorer/ src/components/pages/explorer.tsx src/lib/xelis/ 2>&1 | tail -3
echo '--- LINT DONE ---'

setsid bun run dev > /tmp/dev-server.log 2>&1 < /dev/null &
sleep 10
curl -s -o /dev/null -w 'warmup:%{http_code}\n' http://localhost:3000/explorer --max-time 60

agent-browser set viewport 1600 1000
agent-browser open http://localhost:3000/explorer
sleep 24
for y in 600 1400 2200 3000 3800 4600; do agent-browser eval "window.scrollTo(0, $y)" > /dev/null 2>&1; sleep 0.4; done
agent-browser eval "window.scrollTo(0,0)" > /dev/null 2>&1
sleep 1

echo '=== 3D MODE ==='
agent-browser eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === '3d'); if (b) { b.click(); return 'clicked'; } return 'NO-BTN'; })()" 2>&1 | tail -1
sleep 8
agent-browser eval "(() => document.querySelectorAll('canvas').length + ' canvases')()" 2>&1 | tail -1
agent-browser screenshot /tmp/qa2-3d.png

echo '=== CONSOLE ERRORS AFTER 3D (orphan NaN should be gone) ==='
agent-browser errors | head -6

echo '=== 3D HOVER TEST (pointer over canvas center) ==='
agent-browser mouse move 800 500 > /dev/null 2>&1
sleep 1
agent-browser screenshot /tmp/qa2-3d-hover.png

echo '=== BACK TO 2D + CINEMA MODE ==='
agent-browser eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === '2d'); if (b) { b.click(); return 'clicked-2d'; } return 'NO-BTN'; })()" 2>&1 | tail -1
sleep 2
agent-browser eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => (x.title || '').includes('Cinema')); if (b) { b.click(); return 'clicked'; } return 'NO-BTN'; })()" 2>&1 | tail -1
sleep 3
agent-browser eval "(() => !!document.fullscreenElement ? 'fullscreen-active' : 'fullscreen-INACTIVE')()" 2>&1 | tail -1
agent-browser screenshot /tmp/qa2-cinema.png
agent-browser eval "(() => { document.exitFullscreen(); return 'exited'; })()" > /dev/null 2>&1
sleep 2

echo '=== NETWORK SWITCH → TESTNET ==='
agent-browser eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'TESTNET'); if (b) { b.click(); return 'clicked'; } return 'NO-BTN'; })()" 2>&1 | tail -1
sleep 20
agent-browser eval "(() => document.body.textContent.includes('live · testnet') ? 'badge-testnet' : 'badge-still-' + (document.body.textContent.match(/live · \w+/) || ['none'])[0])()" 2>&1 | tail -1
agent-browser eval "(() => document.body.textContent.includes('The proving ground') ? 'copy-testnet' : 'copy-not-testnet')()" 2>&1 | tail -1
agent-browser screenshot /tmp/qa2-testnet.png
echo '=== TESTNET DATA: block stream should show ~4-digit topo ==='
agent-browser eval "(() => { const btns = Array.from(document.querySelectorAll('button')).filter(b => /^#\d+/.test(b.textContent)); return btns.slice(0,3).map(b => b.textContent.match(/#\d+/)[0]).join(' '); })()" 2>&1 | tail -1

echo '=== SWITCH BACK → MAINNET ==='
agent-browser eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'MAINNET'); if (b) { b.click(); return 'clicked'; } return 'NO-BTN'; })()" 2>&1 | tail -1
sleep 20
agent-browser eval "(() => document.body.textContent.includes('live · mainnet') ? 'badge-mainnet' : 'STILL-TESTNET')()" 2>&1 | tail -1
agent-browser eval "(() => { const btns = Array.from(document.querySelectorAll('button')).filter(b => /^#\d+/.test(b.textContent)); return 'mainnet topos: ' + btns.slice(0,2).map(b => b.textContent.match(/#\d+/)[0]).join(' '); })()" 2>&1 | tail -1

echo '=== DEEP LINK TEST ==='
agent-browser open 'http://localhost:3000/explorer?block=8626800'
sleep 12
agent-browser eval "(() => document.body.textContent.includes('Block #8626800') ? 'deeplink-ok' : 'DEEPLINK-FAIL')()" 2>&1 | tail -1
agent-browser screenshot /tmp/qa2-deeplink.png

echo '=== SLASH SHORTCUT ==='
agent-browser open http://localhost:3000/explorer
sleep 18
agent-browser press /
sleep 1
agent-browser eval "(() => document.activeElement && document.activeElement.id === 'obs-search' ? 'slash-focus-ok' : 'slash-FAIL')()" 2>&1 | tail -1

echo '=== MOBILE 390px (after overflow fix) ==='
agent-browser set viewport 390 844
agent-browser reload
sleep 22
for y in 400 1000 1800 2600 3400 4200 5000; do agent-browser eval "window.scrollTo(0, $y)" > /dev/null 2>&1; sleep 0.4; done
agent-browser eval "(() => document.documentElement.scrollWidth <= 392 ? 'no-overflow' : 'OVERFLOW: ' + document.documentElement.scrollWidth)()" 2>&1 | tail -1
agent-browser eval "window.scrollTo(0,0)" > /dev/null 2>&1; sleep 1
agent-browser screenshot /tmp/qa2-mobile-top.png
agent-browser eval "window.scrollTo(0, 1200)" > /dev/null 2>&1; sleep 1
agent-browser screenshot /tmp/qa2-mobile-mid.png
agent-browser eval "window.scrollTo(0, 2600)" > /dev/null 2>&1; sleep 1
agent-browser screenshot /tmp/qa2-mobile-lower.png

echo '=== FINAL ERRORS ==='
agent-browser errors | head -8
echo '=== DONE ==='
