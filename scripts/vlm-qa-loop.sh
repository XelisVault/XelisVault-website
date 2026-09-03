#!/bin/bash
# VLM QA via z-ai CLI on QA screenshots
set -u
cd /home/z/my-project
TMP=scripts/qa-shots/vlm-tmp
PROMPT="You are a strict web-UI QA reviewer for XELIS Vault, a confidential-finance platform (dark ink + champagne-gold private-banking aesthetic). Answer concisely in max 4 lines:
1. PRIVACY THEME: do the images/photography clearly evoke confidentiality, encryption, sealed vaults, anonymity? (yes/no + 1 line)
2. LEGIBILITY: quote any text that is hard to read because it is too dim or too close to its background color. If none, say none.
3. DEFECTS: broken images, empty frames, overlapping or clipped text. If none, say none."

for f in priv-01-hero priv-03-solution priv-04-xusd priv-05-mobile-hero priv-07-app; do
  echo "=== $f ==="
  z-ai vision -p "$PROMPT" -i "$TMP/$f.jpg" 2>/dev/null | rg -v "^🚀|^✅|Initializing" | head -12
  echo ""
done
