#!/usr/bin/env python3
"""Diff protocol repo entry_chunk_ids.json vs site chunk-ids.ts for all contracts."""
import json, re, sys

proto = json.load(open('/tmp/xelis-vault-protocol/docs/entry_chunk_ids.json'))

# Parse site chunk-ids.ts
site_src = open('/home/z/my-project/src/lib/xelis/chunk-ids.ts').read()
# Format:  "ContractName": {fn: id, ...},
site_contracts = {}
for m in re.finditer(r'"([A-Za-z0-9_]+)":\s*\{([^}]*)\}', site_src):
    name, body = m.group(1), m.group(2)
    entries = {}
    for em in re.finditer(r'([A-Za-z0-9_]+):\s*(-?\d+)', body):
        entries[em.group(1)] = int(em.group(2))
    site_contracts[name] = entries

changed, added, missing = [], [], []
for cname, chunks in proto.items():
    if cname not in site_contracts:
        missing.append(cname)
        continue
    site = site_contracts[cname]
    for cid, info in chunks.items():
        fname = info['name']
        if fname not in site:
            added.append(f'{cname}.{fname} (id {cid})')
        elif site[fname] != int(cid):
            changed.append(f'{cname}.{fname}: site={site[fname]} proto={cid}')

print('=== MISSING CONTRACTS (in proto, not site) ===')
for x in missing: print(' ', x)
print('=== NEW ENTRIES (in proto, not site) ===')
for x in added: print(' ', x)
print('=== CHUNK ID CHANGES ===')
for x in changed: print(' ', x)
print(f'\nProto contracts: {len(proto)} | Site contracts: {len(site_contracts)}')
