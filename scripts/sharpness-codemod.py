#!/usr/bin/env python3
"""Editorial sharpness codemod — kills the "AI look" (pill buttons, glass cards,
glow shadows, scale hovers) across site / sections / pages / app.

Scope deliberately EXCLUDES src/components/explorer and src/components/quest
(playful designs approved by the user).

Rules applied to every className-ish string in .tsx files:
  1. rounded-full on padded / square-icon / centered-flex elements -> rounded-none
     (dots, pings, radial rings without padding are preserved)
  2. rounded-xl / rounded-2xl / rounded-3xl / rounded-lg -> rounded-none
  3. rounded-md -> rounded-[3px]
  4. hover:scale-[...] removed
  5. glow shadows shadow-[0_0_...var(--vault)] / var(--xusd) / var(--vlt) removed
  6. backdrop-blur(-xx) removed inside src/components/app only (glass = AI look)
"""
import re
import sys
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

GLOW_RX = re.compile(
    r'\s*shadow-\[0_0_[^\]]*var\(--(?:vault|xusd|vlt)\)\]'
)
SCALE_RX = re.compile(r'\s*hover:scale-\[[^\]]*\]')

stats = {'pill': 0, 'card': 0, 'md': 0, 'glow': 0, 'scale': 0, 'blur': 0}
changed_files = []


def transform(cls: str, is_app: bool) -> str:
    out = cls
    # 5. glow shadows first (independent tokens)
    new = GLOW_RX.sub(' ', out)
    if new != out:
        stats['glow'] += 1
        out = new
    # 4. hover scale
    new = SCALE_RX.sub(' ', out)
    if new != out:
        stats['scale'] += 1
        out = new
    # 6. backdrop blur removal for app glass
    if is_app:
        new = re.sub(r'\s*backdrop-blur(?:-[a-z]+)?(?![\w-])', ' ', out)
        if new != out:
            stats['blur'] += 1
            out = new

    tokens = out.split()
    changed = False
    res = []
    for t in tokens:
        if t == 'rounded-full':
            if 'animate-ping' in tokens:
                res.append(t)  # status dot halo
                continue
            is_padded = any(PAD_RX.match(x) for x in tokens)
            is_square = any(x in SQUARE_SIZES for x in tokens)
            is_centered = ('flex' in tokens or 'inline-flex' in tokens) and (
                'justify-center' in tokens or 'items-center' in tokens
            )
            has_border = any(x.startswith('border') for x in tokens)
            if (is_padded and (has_border or is_centered or 'font-' in out)) or \
               (is_square and (has_border or is_centered)) or \
               (is_padded and is_centered):
                res.append('rounded-none')
                stats['pill'] += 1
                changed = True
            else:
                res.append(t)  # genuine circle (dot, ring, avatar, gauge)
        elif t in ('rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-lg'):
            res.append('rounded-none')
            stats['card'] += 1
            changed = True
        elif t == 'rounded-md':
            res.append('rounded-[3px]')
            stats['md'] += 1
            changed = True
        else:
            res.append(t)
    return ' '.join(res) if changed else out


def process_file(p: Path) -> bool:
    is_app = 'components/app' in str(p.parent) or str(p.parent).endswith('/src/app') or '/src/app/' in str(p)
    src = p.read_text(encoding='utf-8')
    # Match className="..." / className={`...`} / className={cond ? 'a' : 'b'} strings
    # We operate on every single-quoted or double-quoted string containing class-ish tokens.
    def repl(m):
        body = m.group(2)
        fixed = transform(body, is_app)
        return m.group(1) + fixed + m.group(3)

    # double-quoted strings
    new = re.sub(r'("(?:className|class)":[^,]?)?', '', src)  # no-op guard
    pattern = re.compile(r'([\'"])((?:[^\'"\\\n]|\\.)*)\1')
    # Only transform strings that look like class lists (contain "rounded-" or a tailwind-ish token + are within tsx)
    def string_repl(m):
        body = m.group(2)
        if 'rounded-' not in body and 'backdrop-blur' not in body and 'hover:scale' not in body and 'shadow-[0_0' not in body:
            return m.group(0)
        fixed = transform(body, is_app)
        if fixed != body:
            return m.group(1) + fixed + m.group(1)
        return m.group(0)

    new = pattern.sub(string_repl, src)
    if new != src:
        p.write_text(new, encoding='utf-8')
        changed_files.append(str(p.relative_to(ROOT)))
        return True
    return False


def main():
    total = 0
    for base in SCOPE:
        for p in base.rglob('*.tsx'):
            if process_file(p):
                total += 1
    print(f"files changed: {total}")
    for f in changed_files:
        print('  ' + f)
    print(f"pill->sharp: {stats['pill']}, card->sharp: {stats['card']}, md->3px: {stats['md']}, "
          f"glow removed: {stats['glow']}, scale removed: {stats['scale']}, blur removed: {stats['blur']}")


if __name__ == '__main__':
    main()
