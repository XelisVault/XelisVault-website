#!/usr/bin/env python3
"""Contrast codemod: raise low-opacity text classes that carry information.
Spares decorative separators (·, →) and icon-only usages."""
import re, pathlib

SRC = pathlib.Path('/home/z/my-project/src')

# (pattern, replacement) applied per-line with skip conditions
def skip_decorative(line: str) -> bool:
    deco_markers = ('>·<', '>→<', 'ExternalLink', 'Sparkles', 'Video ', 'EyeOff')
    return any(m in line for m in deco_markers)

rules = [
    # numbers & informative micro-labels
    (r'text-muted-foreground/50', 'text-muted-foreground/70'),
    (r'text-muted-foreground/40', 'text-muted-foreground/60'),
    (r'text-muted-foreground/30', 'text-muted-foreground/60'),
    # big pillar numbers in solution
    (r'text-vault/35', 'text-vault/50'),
    (r'group-hover:text-vault/60', 'group-hover:text-vault/75'),
    # dark band (CTA/footer) quiet text
    (r'text-ink-foreground/50', 'text-ink-foreground/70'),
    (r'text-ink-foreground/60', 'text-ink-foreground/75'),
    (r'text-ink-foreground/30', 'text-ink-foreground/50'),
]

changed_files = 0
changed_lines = 0
for f in SRC.rglob('*.tsx'):
    text = f.read_text()
    lines = text.split('\n')
    out = []
    file_changed = False
    for line in lines:
        new = line
        if skip_decorative(new):
            out.append(new)
            continue
        for pat, rep in rules:
            new = re.sub(pat, rep, new)
        if new != line:
            file_changed = True
            changed_lines += 1
        out.append(new)
    if file_changed:
        f.write_text('\n'.join(out))
        changed_files += 1
        print(f'  {f.relative_to(SRC.parent)}')

print(f'DONE: {changed_files} files, {changed_lines} lines adjusted')
