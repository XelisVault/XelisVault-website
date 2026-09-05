#!/usr/bin/env python3
"""Professional duotone treatment for the Nerva world photography.

Real photos (Unsplash) are converted to a restrained navy/steel-blue duotone
so they integrate with the Nerva brand palette while keeping real texture:
grain, depth of field, real surfaces. This is what makes the page read as
designed, not generated.
"""
from PIL import Image, ImageOps, ImageEnhance
import os

SRC = '/home/z/my-project/public/images/nerva/raw'
DST = '/home/z/my-project/public/images/nerva'

# Nerva brand: deep navy shadows, steel-blue highlights
NAVY = (10, 16, 28)
STEEL = (148, 190, 216)


MID = (79, 103, 122)  # muted steel between navy and highlight


def duotone(src_name, dst_name, max_w=1600, contrast=1.12, brightness=1.0, mid=MID):
    src = os.path.join(SRC, src_name)
    dst = os.path.join(DST, dst_name)
    img = Image.open(src).convert('RGB')
    if img.width > max_w:
        img = img.resize((max_w, int(img.height * max_w / img.width)), Image.LANCZOS)
    g = ImageOps.grayscale(img)
    g = ImageOps.autocontrast(g, cutoff=1)
    g = ImageEnhance.Contrast(g).enhance(contrast)
    g = ImageEnhance.Brightness(g).enhance(brightness)
    duo = ImageOps.colorize(g, black=NAVY, white=STEEL, mid=mid)
    duo.save(dst, quality=80, optimize=True, progressive=True)
    print(f'{dst_name}: {duo.size[0]}x{duo.size[1]}, {os.path.getsize(dst)//1024} KB')


# hero backdrop: PCB macro, dark and calm
duotone('pcb-macro.jpg', 'photo-pcb.jpg', contrast=1.18, brightness=0.8, mid=(64, 88, 110))
# mining section: CPU pins macro, brighter
duotone('cpu-pins.jpg', 'photo-cpu.jpg', contrast=1.1, brightness=0.95, mid=(95, 130, 158))
# network/how-it-works: server racks
duotone('racks-blue.jpg', 'photo-racks.jpg', contrast=1.05, brightness=0.9, mid=(85, 118, 145))
# story/ecosystem: datacenter corridor
duotone('datacenter-corridor.jpg', 'photo-datacenter.jpg', contrast=1.08, brightness=0.88, mid=(75, 104, 130))
print('done')
