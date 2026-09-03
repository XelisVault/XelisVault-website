#!/bin/bash
# QA for privacy reskin: images, captions, contrast, favicon
set -u
cd /home/z/my-project
OUT=scripts/qa-shots
mkdir -p $OUT

echo '=== DESKTOP HOME (1600x1000) ==='
agent-browser set viewport 1600 1000
agent-browser open http://localhost:3000
sleep 12
# dismiss welcome overlay if present (launch gate)
agent-browser find text "enter" click 2>/dev/null | tail -1
sleep 3
agent-browser screenshot $OUT/priv-01-hero.png

echo '=== FAVICON CHECK ==='
agent-browser eval "Array.from(document.querySelectorAll('link[rel*=icon]')).map(l=>l.href).join(' | ')" 2>/dev/null | tail -1
agent-browser eval "document.title" 2>/dev/null | tail -1

echo '=== FULL PAGE DESKTOP ==='
agent-browser screenshot $OUT/priv-02-full.png --full

echo '=== SCROLL: solution/xusd sections ==='
agent-browser eval "document.getElementById('protocol')?.scrollIntoView({behavior:'instant'})" >/dev/null 2>&1
sleep 2
agent-browser screenshot $OUT/priv-03-solution.png
agent-browser eval "document.getElementById('xusd')?.scrollIntoView({behavior:'instant'})" >/dev/null 2>&1
sleep 2
agent-browser screenshot $OUT/priv-04-xusd.png

echo '=== IMAGES SERVED CHECK ==='
agent-browser eval "Array.from(document.images).filter(i=>i.src.includes('/privacy/')).map(i=>i.src.split('/').pop()+':'+(i.complete&&i.naturalWidth>0?'OK':'BROKEN')).join(', ')" 2>/dev/null | tail -1

echo '=== CONSOLE ERRORS ==='
agent-browser errors 2>/dev/null | head -8

echo '=== MOBILE (390x844) ==='
agent-browser set viewport 390 844
agent-browser open http://localhost:3000
sleep 10
agent-browser screenshot $OUT/priv-05-mobile-hero.png
agent-browser eval "window.scrollTo(0, document.body.scrollHeight/2)" >/dev/null 2>&1
sleep 2
agent-browser screenshot $OUT/priv-06-mobile-mid.png

echo '=== APP (open demo app) ==='
agent-browser set viewport 1600 1000
agent-browser open http://localhost:3000
sleep 8
agent-browser find text "launch app" click 2>/dev/null | tail -1
sleep 6
agent-browser screenshot $OUT/priv-07-app.png

echo '=== DONE ==='
ls -la $OUT/priv-*.png 2>/dev/null | head -10
