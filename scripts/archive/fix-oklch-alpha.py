#!/usr/bin/env python3
"""Codemod: fix invalid CSS `oklch(...) / alpha` (slash outside the function).

The pattern `${COLOR} / 0.4` where COLOR = 'oklch(0.72 0.14 160)' produces
INVALID CSS (verified in Chrome: stroke→none, box-shadow→none, color→default).
The fix: alpha(color, a) injects the alpha INSIDE the parens.

Transforms, for the 5 target files only (airdrop.tsx is a false positive):
  1. `${X} / N))`  →  `${alpha(X, N)})`   (drop-shadow had an extra paren)
  2. `${X} / N`    →  `${alpha(X, N)}`
  3. `${scene.color}55` → `${alpha(scene.color, 0.33)}`  (hex-alpha concat)
  4. `${scene.color}26` → `${alpha(scene.color, 0.15)}`
  5. `${scene.color}22` → `${alpha(scene.color, 0.13)}`
Plus: add `alpha` to the '@/lib/countdown' import of each file.
"""
import re

FILES = [
    'src/components/site/feature-tour.tsx',
    'src/components/site/welcome-sequence.tsx',
    'src/components/site/easter-eggs.tsx',
    'src/components/site/launch-celebration.tsx',
    'src/components/site/cinematic-countdown.tsx',
]

# 1) extra-paren drop-shadow first (most specific)
RE_DOUBLE_PAREN = re.compile(r'\$\{([A-Za-z_$][\w$.]*)\} / ([\d.]+)\)\)')
# 2) generic var / alpha
RE_GENERIC = re.compile(r'\$\{([A-Za-z_$][\w$.]*)\} / ([\d.]+)')

HEX_ALPHA = [
    (re.compile(r'\$\{(scene\.color)\}55'), r'${alpha(\1, 0.33)}'),
    (re.compile(r'\$\{(scene\.color)\}26'), r'${alpha(\1, 0.15)}'),
    (re.compile(r'\$\{(scene\.color)\}22'), r'${alpha(\1, 0.13)}'),
]

for path in FILES:
    with open(path) as f:
        src = f.read()
    orig = src

    n1 = len(RE_DOUBLE_PAREN.findall(src))
    src = RE_DOUBLE_PAREN.sub(r'${alpha(\1, \2)})', src)
    n2 = len(RE_GENERIC.findall(src))
    src = RE_GENERIC.sub(r'${alpha(\1, \2)}', src)
    n3 = 0
    for rx, repl in HEX_ALPHA:
        n3 += len(rx.findall(src))
        src = rx.sub(repl, src)

    # ensure `alpha` is imported from '@/lib/countdown'
    if 'alpha(' in src and re.search(r"from '@/lib/countdown'", src):
        m = re.search(r"import \{([^}]*)\} from '@/lib/countdown'", src)
        if m and 'alpha' not in m.group(1).split():
            src = src.replace(m.group(0), m.group(0).replace('{', '{ alpha,', 1))

    if src != orig:
        with open(path, 'w') as f:
            f.write(src)
    print(f"{path}: double-paren={n1} generic={n2} hexalpha={n3}")

print("done")
