#!/bin/bash
# Second round: better queries for the vault/safe theme + alternates.
cd /home/z/my-project/scripts/img-search/raw

run() {
  local name="$1"; local query="$2"
  z-ai image-search -q "$query" --count 6 --gl us --no-rank > "$name.raw.txt" 2>&1
  awk 'flag{print} /^\{/{flag=1; print}' "$name.raw.txt" > "$name.json" 2>/dev/null || true
}

run safe-door    "heavy steel bank vault door with combination wheel dial" &
run gold-vault   "gold bars stacked inside a dark bank vault" &
wait
run deposit-box  "wall of safe deposit boxes in a bank close up" &
run padlock      "golden padlock on dark black background macro photography" &
wait

echo "=== DONE ==="
for f in safe-door.json gold-vault.json deposit-box.json padlock.json; do
  n=$(grep -c '"original_url"' "$f" 2>/dev/null || echo 0)
  echo "$f: $n results"
done
