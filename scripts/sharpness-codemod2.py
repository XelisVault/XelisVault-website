#!/usr/bin/env python3
"""Pass 2 — template-literal class strings.
Splits backtick strings on ${...} interpolation and applies the editorial
sharpness rules to the static chunks, using the whole template for context."""
import re
from pathlib import Path

ROOT = Path('/home/z/my-project')
SCOPE = [
    ROOT / 'src/components/site',
    ROOT / 'src/components/sections',
    ROOT / 'src/components/pages',
    ROOT / 'src/components/app',
    ROOT / 'src/app',
]

SQUARE_SIZES = {
    'w-8', 'h-8', 'w-9', 'h-9', 'w-10', 'h-10', 'w-11', 'h-11',
    'w-12', 'h-12', 'h-13', 'w-13', 'h-14', 'w-14',
}
PAD_RX = re.compile(r'^(px-[\d.]+|py-[\d.]+)$')

SKIP_FILES = {
    'launch-celebration.tsx', 'cinematic-countdown.tsx', 'feature-tour.tsx',
    'easter-eggs.tsx', 'section-navigator.tsx', 'welcome-sequence.tsx',
    'protocol-video.tsx', 'token-icon.tsx', 'progressive-launch-button.tsx',
}

stats = {'pill': 0, 'card': 0, 'md': 0}
files = []


def transform_tokens(tokens):
    out = []
    for t in tokens:
        if t == 'rounded-full':
            if 'animate-ping' in tokens:
                out.append(t)
                continue
            is_padded = any(PAD_RX.match(x) for x in tokens)
            is_square = any(x in SQUARE_SIZES for x in tokens)
            is_centered = ('flex' in tokens or 'inline-flex' in tokens) and (
                'justify-center' in tokens or 'items-center' in tokens)
            has_border = any(x.startswith('border') for x in tokens)
            if (is_padded and (has_border or is_centered)) or (is_square and (has_border or is_centered)):
                out.append('rounded-none')
                stats['pill'] += 1
            else:
                out.append(t)
        elif t in ('rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-lg'):
            out.append('rounded-none')
            stats['card'] += 1
        elif t == 'rounded-md':
            out.append('rounded-[3px]')
            stats['md'] += 1
        else:
            out.append(t)
    return out


def process(p: Path):
    if p.name in SKIP_FILES:
        return False
    src = p.read_text()
    # find all backtick strings (non-greedy, no nested backticks in tsx class strings)
    tpl_rx = re.compile(r'`([^`]*)`')

    def repl(m):
        body = m.group(1)
        if 'rounded-' not in body:
            return m.group(0)
        # context tokens = static chunks joined
        static_parts = re.split(r'\$\{[^}]*\}', body)
        context = ' '.join(static_parts).split()
        if all(not ('rounded-full' in part or any(
                tok in ('rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-lg', 'rounded-md')
                for tok in part.split()) for part in [sp]) for sp in static_parts):
            pass
        new_parts = []
        for sp in static_parts:
            toks = sp.split()
            if not any(t.startswith('rounded-') for t in toks):
                new_parts.append(sp)
                continue
            # use full context to decide pill-ness
            global_tokens = context
            if any(t in ('rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-lg', 'rounded-md') or t == 'rounded-full' for t in toks):
                # decide for rounded-full tokens only; others map directly
                rebuilt = []
                for t in toks:
                    if t == 'rounded-full':
                        if 'animate-ping' in global_tokens:
                            rebuilt.append(t)
                            continue
                        is_padded = any(PAD_RX.match(x) for x in global_tokens)
                        is_square = any(x in SQUARE_SIZES for x in global_tokens)
                        is_centered = ('flex' in global_tokens or 'inline-flex' in global_tokens) and (
                            'justify-center' in global_tokens or 'items-center' in global_tokens)
                        has_border = any(x.startswith('border') for x in global_tokens)
                        if (is_padded and (has_border or is_centered)) or (is_square and (has_border or is_centered)):
                            rebuilt.append('rounded-none')
                            stats['pill'] += 1
                        else:
                            rebuilt.append(t)
                    elif t in ('rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-lg'):
                        rebuilt.append('rounded-none')
                        stats['card'] += 1
                    elif t == 'rounded-md':
                        rebuilt.append('rounded-[3px]')
                        stats['md'] += 1
                    else:
                        rebuilt.append(t)
                new_parts.append(' '.join(rebuilt))
            else:
                new_parts.append(sp)
        # reassemble with interpolations
        pieces = re.split(r'(\$\{[^}]*\})', body)
        result = []
        pi = 0
        for piece in pieces:
            if piece.startswith('${'):
                result.append(piece)
            else:
                # map static piece -> transformed version
                # find matching transformed part by order
                result.append(new_parts[pi] if pi < len(new_parts) else piece)
                pi += 1
        return '`' + ''.join(result) + '`'

    new = tpl_rx.sub(repl, src)
    if new != src:
        p.write_text(new)
        files.append(str(p.relative_to(ROOT)))
        return True
    return False


for base in SCOPE:
    for p in base.rglob('*.tsx'):
        process(p)
print('files changed:', len(files))
for f in files:
    print('  ' + f)
print(stats)
