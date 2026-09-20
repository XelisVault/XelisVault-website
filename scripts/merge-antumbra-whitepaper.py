# -*- coding: utf-8 -*-
"""Fusion couverture + corps : livre blanc ANTUMBRA v1.0 (normalisé A4)."""
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

def normalize(page):
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    if abs(w - A4_W) > 0.05 or abs(h - A4_H) > 0.05:
        page.scale_to(A4_W, A4_H)
    return page

writer = PdfWriter()
writer.add_page(normalize(PdfReader('gen-img-tmp/antumbra-wb-cover.pdf').pages[0]))
for p in PdfReader('gen-img-tmp/antumbra-wb-body.pdf').pages:
    writer.add_page(normalize(p))
writer.add_metadata({
    '/Title': 'Livre blanc ANTUMBRA v1.0 : la couche de confiance de l\'economie humains-machines',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'ANTUMBRA : BlockDAG CPU prive, finalite ancree sur la reputation, identites Braise et Cipher, Kleos, Lumen, eclipses dorees',
})
out = '/home/z/my-project/download/ANTUMBRA-livre-blanc-v1.0.pdf'
with open(out, 'wb') as f:
    writer.write(f)
print('final:', out, '| pages:', len(writer.pages))
