#!/usr/bin/env python3
"""Sweep visible em-dashes (—) from UI strings.

Rules:
- Only process files that render user-visible UI (sections, site, pages, app, explorer, quest overlays).
- Skip lines that are pure comments (//, *, /*, #) — those are invisible to users.
- Replace " — " (spaced em-dash) with ", " by default; handle edge variants:
    "word — word"   -> "word, word"
    "word —" (end)  -> "word"
    "— word" (start of a string) -> "word"
- Report every change for review.
"""
import re
from pathlib import Path

ROOT = Path('/home/z/my-project/src')

TARGET_DIRS = [
    ROOT / 'components' / 'sections',
    ROOT / 'components' / 'site',
    ROOT / 'components' / 'pages',
    ROOT / 'components' / 'app',
    ROOT / 'components' / 'explorer',
    ROOT / 'components' / 'quest',
    ROOT / 'app',
]

# Files where visible text matters most; skip pure logic/lib files.
SKIP_FILES = {
    'countdown.ts', 'demo-store.ts', 'wallet-store.ts', 'mnemonic.ts',
    'secure-storage.ts', 'chunk-ids.ts', 'cli.ts', 'contracts.ts',
    'explorer.ts', 'invoke.ts', 'networks.ts', 'node-ws.ts', 'reads.ts',
    'rpc.ts', 'tx.ts', 'types.ts', 'xswd.ts',
}

COMMENT_RE = re.compile(r'^\s*(//|/\*|\*|#)')

def is_comment(line: str) -> bool:
    stripped = line.strip()
    return bool(stripped) and bool(COMMENT_RE.match(stripped))

def fix_line(line: str):
    """Return (new_line, changed). Only touch string-literal-ish occurrences."""
    if '—' not in line:
        return line, False
    new = line
    # spaced em-dash used as elaboration -> comma
    new = new.replace(' — ', ', ')
    # em-dash clinging to the right end of a word before a quote/end
    new = re.sub(r' —(?=["\'\n])', '', new)
    new = re.sub(r'\s*—\s*$', '', new)
    # leading em-dash after an opening quote
    new = re.sub(r'(["\'])— ', r'\1', new)
    changed = new != line
    return new, changed

def process(path: Path):
    try:
        text = path.read_text(encoding='utf-8')
    except Exception as e:
        print(f'!! {path}: {e}')
        return
    lines = text.split('\n')
    out = []
    changes = []
    for i, line in enumerate(lines, 1):
        if is_comment(line) or '—' not in line:
            out.append(line)
            continue
        new, changed = fix_line(line)
        if changed:
            changes.append((i, line.strip(), new.strip()))
        out.append(new)
    if changes:
        path.write_text('\n'.join(out), encoding='utf-8')
        print(f'\n== {path.relative_to(ROOT.parent)} ({len(changes)} lines)')
        for i, old, new in changes:
            print(f'  L{i}: {old[:100]}')
            print(f'   ->: {new[:100]}')

def main():
    for d in TARGET_DIRS:
        if not d.exists():
            continue
        for p in sorted(d.rglob('*')):
            if p.is_file() and p.suffix in {'.tsx', '.ts'} and p.name not in SKIP_FILES:
                # app modules keep some functional copy; still sweep them
                process(p)

if __name__ == '__main__':
    main()
