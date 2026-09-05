# -*- coding: utf-8 -*-
"""Merge cover + body into the final ANTUMBRA proposal PDF (normalized to A4)."""
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

def normalize(page):
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    if abs(w - A4_W) > 0.05 or abs(h - A4_H) > 0.05:
        page.scale_to(A4_W, A4_H)
    return page

writer = PdfWriter()
writer.add_page(normalize(PdfReader('gen-img-tmp/antumbra-cover.pdf').pages[0]))
for p in PdfReader('gen-img-tmp/antumbra-body.pdf').pages:
    writer.add_page(normalize(p))
writer.add_metadata({
    '/Title': 'Proposition de blockchain ANTUMBRA - XelisVault',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'ANTUMBRA : la couche de confiance de l\'economie humains-machines (v2, remplace ARCANE)',
})
out = '/home/z/my-project/download/antumbra-proposition-blockchain-xelisvault.pdf'
with open(out, 'wb') as f:
    writer.write(f)
print('final:', out, 'pages:', len(writer.pages))
