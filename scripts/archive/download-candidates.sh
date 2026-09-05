#!/bin/bash
# Download top candidates for each image slot, then VLM-verify.
cd /home/z/my-project/scripts/img-search
mkdir -p cand
cd cand

declare -A PICKS
PICKS[vault-door]="890353e518d0.jpg 80158e1901aa.jpg c70104fbd251.jpg 3a67b30f2b96.jpg"
PICKS[datacenter]="88bf14ee591d.jpg d4a25b00cbfb.jpg 3bbd59dad7d3.jpg"
PICKS[fiber]="e6b4c913249d.jpg 180e00b2be40.jpg a5677b0992ab.jpg f984aef6d1cd.jpg"
PICKS[boardroom]="56c7700a5e89.jpg f84f59fb17d0.jpg b4946e4d19c7.jpg"
PICKS[clockwork]="b742e8c369a3.jpg 046b75266d0b.jpg 15faaa732823.jpg 48db5897edc8.jpg"
PICKS[bokeh]="22c350edcde1.jpeg 30ef2a10f03a.jpg 8879f88995bd.jpg d1bc5e229265.jpg"
PICKS[metal-texture]="67a8f7c61343.jpg a9050b6ab5ef.jpg 6047daeb6c12.jpg"

for cat in vault-door datacenter fiber boardroom clockwork bokeh metal-texture; do
  i=0
  for h in ${PICKS[$cat]}; do
    ext="${h##*.}"
    curl -sL "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/$h" -o "${cat}-${i}.${ext}" &
    i=$((i+1))
  done
  wait
done
echo "=== DOWNLOADED ==="
ls -la | awk '{print $9, $5}' | grep -v "^$"
file *.* 2>/dev/null | grep -v JPEG | grep -v PNG | head
