# -*- coding: utf-8 -*-
"""ANTUMBRA: black and white figures for the English whitepaper.

Bitcoin-paper style: white background, black/grey lines, serif fonts,
distinguished by line style rather than color. English labels only,
no em dashes. Vector PDF output for LaTeX inclusion.

Figures:
  1. wp-en-emission.pdf  : cumulative supply curve + per-eclipse emission
  2. wp-en-kleos.pdf     : Kleos trajectories, honest network vs attack,
                           v2 rules vs corrective rules R1-R4
"""

import os
import sys
from math import floor

import matplotlib
matplotlib.use('Agg')
import matplotlib.font_manager as fm

BASE = os.path.dirname(os.path.abspath(__file__))
SIMDIR = BASE
sys.path.insert(0, SIMDIR)

for p in ('/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf',
          '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
          '/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf',
          '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
    if os.path.exists(p):
        fm.fontManager.addfont(p)

import matplotlib.pyplot as plt

plt.rcParams['font.family'] = 'serif'
plt.rcParams['font.serif'] = ['Liberation Serif', 'DejaVu Serif']
plt.rcParams['mathtext.fontset'] = 'stix'
plt.rcParams['axes.unicode_minus'] = False

OUT = os.path.join(BASE, 'gen-img-tmp')
os.makedirs(OUT, exist_ok=True)

INK = '#000000'
GREY1 = '#3a3a3a'
GREY2 = '#6e6e6e'
GREY3 = '#9c9c9c'

PHI = (1 + 5 ** 0.5) / 2
R = 1 / PHI
CAP = 16_180_339
E0 = round(CAP * (1 - R))

# emission series: E_k = floor(E0 * R^k), last eclipse absorbs the remainder
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


def style_ax(ax):
    ax.grid(True, color=GREY3, lw=0.55, alpha=0.55)
    for spine in ('top', 'right'):
        ax.spines[spine].set_visible(False)
    for spine in ('left', 'bottom'):
        ax.spines[spine].set_color(GREY1)
    ax.tick_params(colors=GREY1, labelsize=9.5)
    for lbl in (ax.get_xticklabels() + ax.get_yticklabels()):
        lbl.set_color(GREY1)


# ------------------------------------------------------------------
# Figure 1: emission
# ------------------------------------------------------------------
fig, (ax1, ax2) = plt.subplots(
    1, 2, figsize=(10.2, 4.1), constrained_layout=True,
    gridspec_kw={'width_ratios': [1.35, 1.0]})

xs = [0] + years
ys = [0] + pcts
ax1.plot(xs, ys, color=INK, lw=2.0, solid_capstyle='round')
ax1.axhline(100, color=GREY2, lw=1.0, ls=(0, (6, 3)))
ax1.axhline(61.8, color=GREY1, lw=1.1, ls=(0, (2, 2)))

for yr, pct, note, dy in ((8, 61.8, '10,000,000 ATU (61.8%), year 8', 6),
                          (40, 99.0, '99%, year 40', 5),
                          (136, 100.0, 'exact cap, year 136', 6)):
    ax1.plot([yr], [pct], 'o', color=INK, ms=4.5, mfc='white', mew=1.3,
             zorder=5)
    ax1.annotate(note, (yr, pct), xytext=(-4, dy), textcoords='offset points',
                 fontsize=8.8, color=INK, ha='right')

ax1.set_xlabel('Years after genesis', fontsize=10.5)
ax1.set_ylabel('Share of the cap issued (%)', fontsize=10.5)
ax1.set_xlim(0, 140)
ax1.set_ylim(0, 108)
ax1.set_yticks([0, 20, 40, 61.8, 80, 100])
ax1.set_yticklabels(['0', '20', '40', '61.8', '80', '100'])
style_ax(ax1)

K = 12
labels = ['%d' % (i + 1) for i in range(K)]
vals = [emissions[i] for i in range(K)]
bars = ax2.bar(labels, vals, color='#d9d9d9', edgecolor=INK, lw=0.9,
               width=0.62)
bars[0].set_facecolor('#8c8c8c')
ax2.set_yscale('log')
ax2.set_ylim(10, 2 * 10 ** 7)
ax2.set_xlabel('Eclipse (four years each)', fontsize=10.5)
ax2.set_ylabel('ATU issued (log scale)', fontsize=10.5)
ax2.annotate('6,180,340', (0, vals[0]), xytext=(5, 5),
             textcoords='offset points', fontsize=8.6, color=INK)
ax2.annotate('3,819,660', (1, vals[1]), xytext=(5, 5),
             textcoords='offset points', fontsize=8.6, color=INK)
style_ax(ax2)

f1 = os.path.join(OUT, 'wp-en-emission.pdf')
fig.savefig(f1, facecolor='white')
plt.close(fig)
print('figure 1:', f1, '| eclipses:', len(emissions),
      '| sum == cap:', sum(emissions) == CAP)

# ------------------------------------------------------------------
# Figure 2: Kleos trajectories
# ------------------------------------------------------------------
import antumbra_kleos_sim as sim_mod

_, _, hV, _, _, _, _ = sim_mod.simulate(attack=True, fixes=False)  # v2 rules, broken
id0, _, h0, _, _, _, _ = sim_mod.simulate(attack=False)  # honest, R1-R4
idA, _, hA, _, _, _, _ = sim_mod.simulate(attack=True, fixes=True)

years0 = [h['year'] for h in h0]
yearsV = [h['year'] for h in hV]
yearsA = [h['year'] for h in hA]

fig, ax = plt.subplots(figsize=(9.2, 4.6), constrained_layout=True)

ax.plot(years0, [h['hon_p50'] for h in h0], color=INK, lw=2.0,
        label='Honest network, median Kleos')
ax.plot(years0, [h['hon_p90'] for h in h0], color=INK, lw=1.4, ls='--',
        label='Honest network, 90th percentile')
ax.plot(yearsV, [h['fake_max'] for h in hV], color=GREY1, lw=1.9,
        ls=(0, (5, 2)), label='Best fake profile, v2 rules (the flaw)')
ax.plot(yearsA, [h['fake_max'] for h in hA], color=GREY2, lw=1.9, ls='-.',
        label='Best fake profile, rules R1 to R4')
ax.plot(yearsA, [h['fake_med'] for h in hA], color=GREY2, lw=1.4, ls=':',
        label='Fake profiles, median, rules R1 to R4')
ax.plot(years0, [h['whale_max'] for h in h0], color=GREY3, lw=1.6,
        ls=(0, (1, 1)), label='Whale, capital only, never a candidate')
ax.axhline(sim_mod.SEAT_THRESHOLD, color=INK, lw=1.1, ls=(0, (6, 3)))
ax.text(0.25, sim_mod.SEAT_THRESHOLD + 2.5,
        'candidacy threshold for the Ring (Kleos 70)',
        fontsize=9.2, color=INK)

ax.set_xlabel('Years after genesis', fontsize=10.5)
ax.set_ylabel('Kleos score (0 to 100)', fontsize=10.5)
ax.set_xlim(0, 16)
ax.set_ylim(0, 100)
style_ax(ax)
leg = ax.legend(fontsize=8.6, frameon=True, loc='lower right',
                borderpad=0.7, labelspacing=0.55)
leg.get_frame().set_edgecolor(GREY2)
leg.get_frame().set_linewidth(0.7)

f2 = os.path.join(OUT, 'wp-en-kleos.pdf')
fig.savefig(f2, facecolor='white')
plt.close(fig)
print('figure 2:', f2)
