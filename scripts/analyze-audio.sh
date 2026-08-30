#!/bin/bash
# Analyse express : énergie RMS par tranche de 2s + transcription par segments
set -e
SRC=/home/z/my-project/upload/Test.mp3
OUT=/home/z/my-project/scripts/audio-analysis
mkdir -p $OUT

# 1) Énergie RMS toutes les 2 secondes → trouver le drop et la structure
ffmpeg -i $SRC -af "asetnsamples=88200,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>/dev/null | grep RMS_level | sed 's/.*=//' | awk 'NR%2==1' > $OUT/rms.txt
python3 - << 'EOF'
import math
vals = []
for line in open('/home/z/my-project/scripts/audio-analysis/rms.txt'):
    line = line.strip()
    try: vals.append(float(line))
    except: vals.append(float('nan'))
# fenêtre 2s → points toutes les 2s
print("Énergie (dB RMS) par tranche de 2 s :")
for i in range(0, len(vals), 1):
    t = i * 2
    v = vals[i]
    if not math.isnan(v):
        bar = '#' * max(0, int((v + 60) / 2))
        print(f"{t:5.0f}s  {v:7.1f} dB  {bar}")
EOF
