# -*- coding: utf-8 -*-
"""ANTUMBRA : figure du calendrier d'émission « Éclipses dorées ».

Deux panneaux : courbe cumulée vers le plafond (16 180 339 ATU) et
émission par éclipse (série géométrique de raison 1/phi).
Figures en français, sans tiret cadratin, palette du livre blanc.
"""
import os
from math import log, floor

import matplotlib.font_manager as fm
for p in ('/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf',
          '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
    if os.path.exists(p):
        fm.fontManager.addfont(p)
import matplotlib.pyplot as plt

plt.rcParams['font.sans-serif'] = ['Noto Sans SC', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

PHI = (1 + 5 ** 0.5) / 2
R = 1 / PHI
CAP = 16_180_339
E0 = round(CAP * (1 - R))

# série d'émission : E_k = floor(E0 * R^k), la dernière absorbe le solde
emissions = []
n = 0
while True:
    e = floor(E0 * (R ** n) + 1e-9)
    if e * 10 ** 8 / (4 * 365.25 * 86400 / 2) < 1:
        emissions.append(e)
        break
    emissions.append(e)
    if n > 100:
        break
    n += 1
total = sum(emissions)
emissions[-1] += CAP - total

years, cumul, pcts = [], [], []
c = 0
for i, e in enumerate(emissions):
    c += e
    years.append((i + 1) * 4)
    cumul.append(c)
    pcts.append(100.0 * c / CAP)

BLUE, GOLD, GREY = '#2d7ab3', '#b07d2e', '#7f8c8d'

fig, (ax1, ax2) = plt.subplots(
    1, 2, figsize=(10.6, 4.6), constrained_layout=True,
    gridspec_kw={'width_ratios': [1.35, 1.0]})

# ── panneau 1 : courbe cumulée ──
xs = [0] + years
ys = [0] + pcts
ax1.plot(xs, ys, color=BLUE, lw=2.4)
ax1.fill_between(xs, ys, color=BLUE, alpha=0.10)
ax1.axhline(100, color=GREY, lw=1.0, ls=(0, (6, 3)))
ax1.axhline(61.8, color=GOLD, lw=1.2, ls=(0, (6, 3)))

for yr, pct, note, dy in ((8, 61.8, '10 000 000 ATU · 61,8 % (an 8)', 7),
                          (40, 99.0, '99 % (an 40)', 6),
                          (136, 100.0, 'cap exact (an 136)', 8)):
    ax1.plot([yr], [pct], 'o', color=GOLD, ms=5.5, zorder=5)
    ax1.annotate(note, (yr, pct), xytext=(-6, dy), textcoords='offset points',
                 fontsize=9, color='#142840', ha='right')

ax1.set_xlabel('Années après la genèse', fontsize=11)
ax1.set_ylabel('Part du plafond émise (%)', fontsize=11)
ax1.set_title('Émission cumulée vers le plafond de 16 180 339 ATU',
              fontsize=11.5, pad=10)
ax1.set_xlim(0, 140)
ax1.set_ylim(0, 108)
ax1.set_yticks([0, 20, 40, 61.8, 80, 100])
ax1.set_yticklabels(['0', '20', '40', '61,8', '80', '100'])
ax1.grid(True, alpha=0.28, lw=0.7)
for spine in ('top', 'right'):
    ax1.spines[spine].set_visible(False)

# ── panneau 2 : émission par éclipse (12 premières) ──
K = 12
labels = ['%d' % (i + 1) for i in range(K)]
vals = [emissions[i] for i in range(K)]
bars = ax2.bar(labels, vals, color=BLUE, alpha=0.85, width=0.62)
bars[0].set_color(GOLD)
ax2.set_yscale('log')
ax2.set_ylim(10, 2 * 10 ** 7)
ax2.set_xlabel('Éclipse (4 ans chacune)', fontsize=11)
ax2.set_ylabel('ATU émis (échelle log)', fontsize=11)
ax2.set_title('Chaque éclipse émet 61,8 % de la précédente',
              fontsize=11.5, pad=10)
ax2.annotate('6 180 340', (0, vals[0]), xytext=(4, 6), textcoords='offset points',
             fontsize=8.5, color='#142840')
ax2.annotate('3 819 660', (1, vals[1]), xytext=(4, 6), textcoords='offset points',
             fontsize=8.5, color='#142840')
ax2.grid(True, axis='y', alpha=0.28, lw=0.7)
for spine in ('top', 'right'):
    ax2.spines[spine].set_visible(False)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   'gen-img-tmp', 'antumbra-emission.png')
fig.savefig(out, dpi=200, facecolor='white')
plt.close(fig)
print('figure:', out, '| éclipses:', len(emissions),
      '| total:', sum(emissions), '== cap:', sum(emissions) == CAP)
