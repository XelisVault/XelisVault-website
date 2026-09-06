# -*- coding: utf-8 -*-
"""Moteur de rendu du LIVRE BLANC ANTUMBRA v1.0.

Pipeline Report (pdf skill) : corps ReportLab + sommaire auto (multiBuild),
couverture séparée (html2poster.js), fusion pypdf. Palette Crystal Blue.
Contraintes propres au livre blanc : aucun tiret cadratif, caractères
interdits refusés au chargement, formules numérotées centrées.
"""
import sys, os, hashlib, re

PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, "scripts"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                Table, TableStyle, KeepTogether, CondPageBreak,
                                HRFlowable, Image)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage

# ── fonts ──
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

from pdf import install_font_fallback  # noqa: E402
install_font_fallback()

# ── palette (corps, Template 07 Crystal Blue, valeurs fixes) ──
PAGE_BG      = colors.HexColor('#f5f8fc')
CARD_BG      = colors.HexColor('#e4ecf5')
TABLE_STRIPE = colors.HexColor('#eef3fa')
HEADER_FILL  = colors.HexColor('#1a4a7a')
BORDER       = colors.HexColor('#c0d0e2')
ACCENT       = colors.HexColor('#2d7ab3')
TEXT_PRIMARY = colors.HexColor('#142840')
TEXT_MUTED   = colors.HexColor('#5a7a96')

# ── document geometry ──
PAGE_W, PAGE_H = A4
MARGIN = 62
TOP_M, BOT_M = 74, 64
AVAIL_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - TOP_M - BOT_M
DOC_TITLE = "Livre blanc ANTUMBRA v1.0 · la couche de confiance de l'économie humains-machines"
FOOTER = "ANTUMBRA · livre blanc v1.0 · septembre 2026"
TOC_PAGES = 2  # pages du sommaire (vérifié par assertion après construction)
ROMAN = {1: 'i', 2: 'ii', 3: 'iii', 4: 'iv'}

# ── garde-fous de contenu ──
FORBIDDEN = re.compile('[\u2014\u2026\u00b2\u00b3\u2070-\u209f'
                       '\U0001F000-\U0001FAFF\u2600-\u27bf'
                       '\u4e00-\u9fff\u3040-\u30ff]')

def guard(text, where):
    m = FORBIDDEN.search(text)
    if m:
        raise ValueError(f'caractère interdit {m!r} dans {where}: {text[:70]}')

# ── styles ──
S_BODY = ParagraphStyle('Body', fontName='FreeSerif', fontSize=10.5, leading=17,
                        alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY,
                        spaceBefore=0, spaceAfter=10)
S_H1 = ParagraphStyle('H1', fontName='FreeSerif-Bold', fontSize=22, leading=27,
                      alignment=TA_LEFT, textColor=TEXT_PRIMARY,
                      spaceBefore=18, spaceAfter=4)
S_H2 = ParagraphStyle('H2', fontName='FreeSerif-Bold', fontSize=15, leading=20,
                      alignment=TA_LEFT, textColor=HEADER_FILL,
                      spaceBefore=14, spaceAfter=6)
S_BULLET = ParagraphStyle('Bullet', fontName='FreeSerif', fontSize=10.5, leading=16,
                          alignment=TA_LEFT, textColor=TEXT_PRIMARY,
                          leftIndent=16, bulletIndent=4, spaceAfter=7)
S_CAPTION = ParagraphStyle('Caption', fontName='FreeSerif', fontSize=8.5, leading=12,
                           alignment=TA_CENTER, textColor=TEXT_MUTED,
                           spaceBefore=3, spaceAfter=6)
S_QUOTE = ParagraphStyle('Quote', fontName='FreeSerif-Italic', fontSize=11.5, leading=18,
                         alignment=TA_LEFT, textColor=HEADER_FILL, leftIndent=10)
S_FORMULA = ParagraphStyle('Formula', fontName='FreeSerif', fontSize=11.5, leading=17,
                           alignment=TA_CENTER, textColor=TEXT_PRIMARY,
                           spaceBefore=6, spaceAfter=2)
S_FORMULA_NUM = ParagraphStyle('FormulaNum', fontName='FreeSerif', fontSize=9,
                               leading=12, alignment=TA_CENTER,
                               textColor=TEXT_MUTED, spaceAfter=10)
S_TH = ParagraphStyle('TH', fontName='FreeSerif', fontSize=9.5, leading=12.5,
                      alignment=TA_CENTER, textColor=colors.white)
S_TD = ParagraphStyle('TD', fontName='FreeSerif', fontSize=9, leading=12.5,
                      alignment=TA_LEFT, textColor=TEXT_PRIMARY, wordWrap='CJK')
S_STAT = ParagraphStyle('StatBig', fontName='FreeSerif-Bold', fontSize=22, leading=26,
                        textColor=ACCENT, alignment=TA_CENTER)
S_STAT_LBL = ParagraphStyle('StatLabel', fontName='FreeSerif', fontSize=9, leading=12,
                            textColor=TEXT_MUTED, alignment=TA_CENTER)
S_TOC_TITLE = ParagraphStyle('TocTitle', fontName='FreeSerif-Bold', fontSize=22, leading=27,
                             textColor=TEXT_PRIMARY, spaceAfter=16)

# ── TOC template ──
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text,
                                     max(1, self.page - TOC_PAGES), key))

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 44, DOC_TITLE)
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.5)
    canvas.line(MARGIN, PAGE_H - 52, PAGE_W - MARGIN, PAGE_H - 52)
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 46, PAGE_W - MARGIN, 46)
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, 34, FOOTER)
    if doc.page <= TOC_PAGES:
        label = ROMAN.get(doc.page, 'i' * doc.page)
    else:
        label = str(doc.page - TOC_PAGES)
    canvas.drawRightString(PAGE_W - MARGIN, 34, label)
    canvas.restoreState()

# ── helpers ──
def fr(text):
    """Typographie française du corps : espace insécable avant : ; ! ? %."""
    out = text
    for sep in (':', ';', '!', '?', '%'):
        out = out.replace(' ' + sep, '\u00a0' + sep)
    return out

def heading(text, style, level):
    key = 'h_' + hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def build_table(spec):
    ratios = spec['ratios'] or [1.0 / len(spec['head'])] * len(spec['head'])
    col_w = [r * AVAIL_W for r in ratios]
    data = [[Paragraph('<b>%s</b>' % h, S_TH) for h in spec['head']]]
    for row in spec['rows']:
        data.append([Paragraph(fr(str(c)), S_TD) for c in row])
    assert sum(col_w) <= AVAIL_W + 0.5, 'table overflow'
    t = Table(data, colWidths=col_w, hAlign='CENTER', repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 5.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5.5),
    ]
    for i in range(1, len(data)):
        style.append(('BACKGROUND', (0, i), (-1, i),
                      TABLE_STRIPE if i % 2 == 1 else colors.white))
    t.setStyle(TableStyle(style))
    out = [Spacer(1, 14), t]
    if spec['caption']:
        out += [Spacer(1, 2), Paragraph(spec['caption'], S_CAPTION)]
    out.append(Spacer(1, 12))
    return out

def build_callout(spec):
    box = Table([[Paragraph('<b>%s</b>' % spec['big'], S_STAT)],
                 [Paragraph(fr(spec['label']), S_STAT_LBL)]],
                colWidths=[330], hAlign='CENTER')
    box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, ACCENT),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
        ('TOPPADDING', (0, 1), (-1, 1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return [Spacer(1, 10), KeepTogether(box), Spacer(1, 12)]

def build_quote(text):
    q = Table([[Paragraph(fr(text), S_QUOTE)]], colWidths=[AVAIL_W * 0.86], hAlign='CENTER')
    q.setStyle(TableStyle([
        ('LINEBEFORE', (0, 0), (0, 0), 2, ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return [Spacer(1, 8), KeepTogether(q), Spacer(1, 10)]

def build_formula(text, num):
    block = Table([[Paragraph(text, S_FORMULA)],
                   [Paragraph('(%d)' % num, S_FORMULA_NUM)]],
                  colWidths=[AVAIL_W * 0.82], hAlign='CENTER')
    block.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), TABLE_STRIPE),
        ('BOX', (0, 0), (-1, -1), 0.6, BORDER),
        ('TOPPADDING', (0, 0), (-1, 0), 7),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
        ('TOPPADDING', (0, 1), (-1, 1), 0),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    return [Spacer(1, 6), KeepTogether(block), Spacer(1, 8)]

def build_figure(spec):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), spec['path'])
    pil = PILImage.open(path)
    ow, oh = pil.size
    max_w, max_h = AVAIL_W * 0.96, PAGE_H * 0.32
    ratio = min(max_w / ow if ow > max_w else 1.0, max_h / oh if oh > max_h else 1.0)
    img = Image(path, width=ow * ratio, height=oh * ratio)
    return [Spacer(1, 14), KeepTogether([img, Paragraph(spec['caption'], S_CAPTION)]),
            Spacer(1, 12)]

# ── assemble the story ──
import antumbra_whitepaper as content  # noqa: E402

# garde-fous : vérifier chaque bloc AVANT tout rendu
for idx, (kind, payload) in enumerate(content.C):
    if kind in ('h1', 'h2', 'body', 'bullet', 'quote'):
        guard(payload, f'bloc {idx} ({kind})')
    elif kind == 'formula':
        guard(payload, f'bloc {idx} (formula)')
    elif kind in ('table', 'callout'):
        d = payload
        for k in ('caption', 'big', 'label'):
            if d.get(k):
                guard(str(d[k]), f'bloc {idx} ({kind}.{k})')
        if kind == 'table':
            for h in d['head']:
                guard(str(h), f'bloc {idx} (table.head)')
            for row in d['rows']:
                for c in row:
                    guard(str(c), f'bloc {idx} (table.cell)')
    elif kind == 'figure':
        guard(payload.get('caption', ''), f'bloc {idx} (figure)')

story = []
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle('TOC0', fontName='FreeSerif', fontSize=11.5, leading=20,
                   leftIndent=14, textColor=TEXT_PRIMARY),
    ParagraphStyle('TOC1', fontName='FreeSerif', fontSize=10, leading=16,
                   leftIndent=32, textColor=TEXT_MUTED),
]
story.append(Paragraph('<b>Sommaire</b>', S_TOC_TITLE))
story.append(HRFlowable(width='100%', color=ACCENT, thickness=1.2, spaceAfter=14))
story.append(toc)
story.append(PageBreak())

chapter = 0
formula_no = 0
i = 0
blocks = content.C
while i < len(blocks):
    kind, payload = blocks[i]
    if kind == 'h1':
        chapter += 1
        title = '%d · %s' % (chapter, payload)
        h = heading(title, S_H1, 0)
        rule = HRFlowable(width='100%', color=ACCENT, thickness=1.2,
                          spaceBefore=0, spaceAfter=12)
        story.append(CondPageBreak(AVAIL_H * 0.25))
        story.append(KeepTogether([h, rule]))
    elif kind == 'h2':
        story.append(CondPageBreak(70))
        story.append(heading(payload, S_H2, 1))
    elif kind == 'body':
        story.append(Paragraph(fr(payload), S_BODY))
    elif kind == 'bullet':
        story.append(Paragraph(fr(payload), S_BULLET, bulletText='•'))
    elif kind == 'formula':
        formula_no += 1
        story.extend(build_formula(payload, formula_no))
    elif kind == 'table':
        story.extend(build_table(payload))
    elif kind == 'callout':
        story.extend(build_callout(payload))
    elif kind == 'quote':
        story.extend(build_quote(payload))
    elif kind == 'figure':
        story.extend(build_figure(payload))
    i += 1

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        'gen-img-tmp', 'antumbra-wb-body.pdf')
doc = TocDocTemplate(out_path, pagesize=A4,
                     leftMargin=MARGIN, rightMargin=MARGIN,
                     topMargin=TOP_M, bottomMargin=BOT_M,
                     title=DOC_TITLE, author='Z.ai', creator='Z.ai',
                     subject="ANTUMBRA : la couche de confiance de l'économie humains-machines, livre blanc v1.0")
doc.multiBuild(story, onFirstPage=on_page, onLaterPages=on_page)

# assertion : le chapitre 1 commence bien sur la page physique TOC_PAGES+1
def _page_text(n):
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(out_path)
    return pdf[n - 1].get_textpage().get_text_range()

first = _page_text(TOC_PAGES + 1)
assert '1 · Résumé exécutif' in first, (
    f'le chapitre 1 n\'est pas sur la page {TOC_PAGES + 1} : ajuster TOC_PAGES. '
    f'Début réel : {first[:80]}')
print('body written:', out_path, '| chapters:', chapter, '| formulas:', formula_no,
      '| pagination OK, chapitre 1 en page', TOC_PAGES + 1)
