#!/usr/bin/env python3
"""Decode every QR code in the rendered PNGs (tag sheets, receipts,
paper wallets). Uses zbar (pyzbar) — the family of decoders phone camera
apps derive from — with OpenCV as a fallback. Exits 1 if any QR yields an
empty payload or if a page that should carry QRs carries none."""
import sys
import cv2

try:
    from pyzbar.pyzbar import decode as zbar_decode
except ImportError:
    zbar_decode = None


def decode_all(path):
    results = []
    if zbar_decode is not None:
        from PIL import Image
        img = Image.open(path)
        for r in zbar_decode(img):
            x, y, w, h = r.rect.left, r.rect.top, r.rect.width, r.rect.height
            results.append((r.data.decode("utf-8", "replace"), (x, y, w, h)))
    if not results:
        img = cv2.imread(path)
        if img is None:
            print(f"!! cannot read {path}")
            return []
        detector = cv2.QRCodeDetector()
        ok, decoded, points, _ = detector.detectAndDecodeMulti(img)
        if ok and points is not None:
            for i, d in enumerate(decoded):
                x, y, w, h = cv2.boundingRect(points[i].astype(int))
                results.append((d, (x, y, w, h)))
    return results


exit_code = 0
for path in sys.argv[1:]:
    print(f"=== {path} ===")
    res = decode_all(path)
    if not res:
        print("  NO QR CODE DECODED  <-- PROBLEM")
        exit_code = 1
    for data, (x, y, w, h) in res:
        if not data:
            print(f"  [{x:5d},{y:5d} {w:4d}x{h:4d}] EMPTY PAYLOAD  <-- PROBLEM")
            exit_code = 1
            continue
        print(f"  [{x:5d},{y:5d} {w:4d}x{h:4d}] ok")
        print(f"    payload: {data[:160]}{'…' if len(data) > 160 else ''}")
    print(f"  total: {len(res)} QR(s)")

sys.exit(exit_code)
