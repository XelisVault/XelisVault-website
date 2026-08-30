#!/usr/bin/env python3
"""Generate src/lib/xelis/chunk-ids.ts from protocol docs/entry_chunk_ids.json"""
import json

with open('/home/z/my-project/xelis-vault-protocol/docs/entry_chunk_ids.json') as f:
    data = json.load(f)

lines = []
lines.append('// AUTO-GENERATED from xelis-vault docs/entry_chunk_ids.json (v11.7 chunk map, deployment v12R)')
lines.append('// Each entry maps a function name to its COMPILED chunk ID (the ID to use in')
lines.append('// invoke_contract.entry_id). Only kind === "Entry" (wallet-invokable) are listed.')
lines.append('// pub fn chunks (kind === "All") are cross-contract only and NOT wallet-invokable.')
lines.append('')
lines.append('export const CHUNK_IDS: Record<string, Record<string, number>> = {')

for contract in sorted(data.keys()):
    entries = data[contract]
    fns = {}
    for cid, info in entries.items():
        if info.get('kind') == 'Entry' and info.get('name'):
            fns[info['name']] = int(cid)
    if not fns:
        continue
    fn_items = ', '.join(f'{k}: {v}' for k, v in sorted(fns.items(), key=lambda x: x[1]))
    lines.append(f"  {json.dumps(contract)}: {{{fn_items}}},")

lines.append('}')
lines.append('')
lines.append('// Aliases used by the protocol CLI (protocol.py)')
lines.append('export const CONTRACT_ALIASES: Record<string, string> = {')
lines.append('  VaultEngine: \'VaultEngineV3\',')
lines.append('  VaultSwap: \'VaultSwapV2\',')
lines.append('  FounderVesting4y: \'FounderVesting\',')
lines.append('  FounderVesting10y: \'FounderVesting\',')
lines.append('}')
lines.append('')
lines.append('/** Resolve the chunk ID for a contract entry function. Returns -1 if unknown. */')
lines.append('export function entryId(contract: string, fn: string): number {')
lines.append('  const resolved = CONTRACT_ALIASES[contract] ?? contract')
lines.append('  const m = CHUNK_IDS[resolved]')
lines.append('  if (m && fn in m) return m[fn]')
lines.append('  return -1')
lines.append('}')
lines.append('')

out = '\n'.join(lines)
with open('/home/z/my-project/src/lib/xelis/chunk-ids.ts', 'w') as f:
    f.write(out)
n = sum(1 for c in data.values() for e in c.values() if e.get('kind') == 'Entry')
print(f'OK: {len(data)} contracts, {n} entries written')
