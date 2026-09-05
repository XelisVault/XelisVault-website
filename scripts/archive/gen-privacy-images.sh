#!/bin/bash
# Generate 7 privacy-themed images for XelisVault website
# Style: deep warm ink + champagne gold, private-banking premium, encryption/privacy motifs
# Replaces the old "bank" imagery (alps, gold bars, marble, watches) with privacy visuals.

set -u
OUT_DIR="/home/z/my-project/public/images/privacy"
TMP_DIR="/home/z/my-project/scripts/gen-img-tmp"
mkdir -p "$OUT_DIR" "$TMP_DIR"

# Shared style suffix for visual consistency
STYLE="cinematic premium photography, deep warm charcoal-black ink palette with champagne gold and bronze accents, dramatic chiaroscuro lighting, luxury private banking aesthetic, photorealistic, ultra detailed, high quality, no text, no letters, no watermark"

declare -A JOBS=(
  ["hero-privacy"]="864x1152|A massive circular bank vault door in dark brushed steel, its thick locking bolts retracted, an elegant golden combination dial with engraved tick marks at the center, thin golden cryptographic circuit lines and a subtle hexagonal cipher lattice glowing softly around the vault fading into darkness, sealed confidential data concept, $STYLE"
  ["crypto-layers"]="864x1152|Abstract layered architecture of privacy: stacked translucent obsidian glass strata floating in darkness, each layer engraved with faint golden geometric cipher patterns and sealed with a small gold wax-like medallion, warm champagne light glowing between the layers, depth of field, encrypted protocol layers concept, $STYLE"
  ["encrypted-transfer"]="864x1152|Two anonymous figures in dark tailored suits seen as elegant silhouettes without visible faces, exchanging a small sealed golden sphere glowing softly, streams of blurred unreadable cipher glyphs flowing between them like golden dust in the dark air, confidential transaction concept, $STYLE"
  ["private-governance"]="1152x864|A dark wood oval boardroom table in a dim private chamber, faceless elegant silhouettes of board members around it rendered as dark shapes, at the center of the table a golden seal stamp and an old brass key glowing under a single warm spotlight from above, confidential governance ritual, $STYLE"
  ["oracle-precision"]="864x1152|Extreme macro of an exquisite golden watchmaker mechanism fused with a small polished brass padlock at its heart, tiny gears balance wheel and engraved arabesques, warm champagne light raking across the metal, dark ink background, precision instrument sealed against tampering, $STYLE"
  ["steady-emission"]="1152x864|A calm steady river of fine golden particles flowing smoothly through deep darkness between banks of soft dark encrypted fog, regular rhythmic streams like a private emission schedule, subtle bokeh, quiet understated motion, steady yield concept, $STYLE"
  ["cipher-texture"]="1344x768|Abstract dark background texture, a field of blurred unreadable cipher-like glyph patterns in dim champagne gold dissolving into deep warm black ink, a large faint shield silhouette dissolving in bokeh at the center, very dark overall, subtle, elegant, wallpaper-like texture, $STYLE"
)

FAIL=0
for name in hero-privacy crypto-layers encrypted-transfer private-governance oracle-precision steady-emission cipher-texture; do
  IFS='|' read -r size prompt <<< "${JOBS[$name]}"
  out_png="$TMP_DIR/$name.png"
  # Skip if already generated (idempotent re-runs)
  if [ -f "$OUT_DIR/$name.jpg" ] && [ $(stat -c%s "$OUT_DIR/$name.jpg") -gt 30000 ]; then
    echo "SKIP $name (exists)"
    continue
  fi
  echo "GEN  $name ($size) ..."
  if z-ai image -p "$prompt" -o "$out_png" -s "$size" 2>&1 | tail -2; then
    if [ -f "$out_png" ] && [ $(stat -c%s "$out_png") -gt 30000 ]; then
      echo "OK   $name -> $(stat -c%s "$out_png") bytes (png)"
    else
      echo "FAIL $name (missing or too small)"
      FAIL=1
    fi
  else
    echo "FAIL $name (cli error)"
    FAIL=1
  fi
done

echo "DONE gen pass, fail=$FAIL"
