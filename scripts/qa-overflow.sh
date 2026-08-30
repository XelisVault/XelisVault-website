#!/bin/bash
set -u
cd /home/z/my-project
setsid bun run dev > /tmp/dev-server.log 2>&1 < /dev/null &
sleep 10
curl -s -o /dev/null -w 'warmup:%{http_code}\n' http://localhost:3000/explorer --max-time 60

agent-browser set viewport 390 844
agent-browser open http://localhost:3000/explorer
sleep 22
# scroll to reveal everything
for y in 400 800 1200 1600 2000 2400 2800 3200 3600 4000 4400 4800 5200; do
  agent-browser eval "window.scrollTo(0, $y)" > /dev/null 2>&1
  sleep 0.4
done
sleep 1
echo '=== OVERFLOW CULPRITS (elements wider than viewport) ==='
agent-browser eval "(() => { const bad = []; document.querySelectorAll('*').forEach(el => { const r = el.getBoundingClientRect(); if (r.right > 392 || r.width > 392) { bad.push(el.tagName + '.' + String(el.className).split(' ').slice(0,3).join('.') + ' w=' + Math.round(r.width) + ' right=' + Math.round(r.right)); } }); return bad.slice(0, 25).join('\n'); })()" 2>&1 | tail -25
echo '=== SCROLLWIDTH ==='
agent-browser eval "document.documentElement.scrollWidth" 2>&1 | tail -1
