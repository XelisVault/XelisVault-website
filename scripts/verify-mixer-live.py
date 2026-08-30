#!/usr/bin/env python3
"""Validate the new PrivacyMixer v2 address + storage keys against the live testnet node."""
import json, urllib.request

NODE = 'https://testnet-node.xelis.io/json_rpc'
MIXER = 'ffd504e24caad25b8f74e512318a66c45229dc2702dec0ecf66540065690d2d5'
OLD_MIXER = 'd384649c8f8f52116a198d2125bd1b6c3dff9bfda55643979c85a28631a6261d'
XEL = '0' * 64
XUSD = 'be39794c4a32f231d410c8be3a4d9e80455c667d902c5edf8527dea52533356e'

def rpc(method, params=None):
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': method}
    if params is not None:
        payload['params'] = params
    req = urllib.request.Request(NODE, data=json.dumps(payload).encode(),
                                 headers={'Content-Type': 'application/json',
                                          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
                                          'Origin': 'https://xelisvault.io',
                                          'Referer': 'https://xelisvault.io/'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def key_str(s):
    # ValueCell: {"type":"primitive","value":{"type":"string","value":s}}
    return {'type': 'primitive', 'value': {'type': 'string', 'value': s}}

def read_key(contract, key):
    return rpc('get_contract_data', {'contract': contract, 'key': key_str(key)})

# key encoding: XELIS storage keys are strings passed as "key" param
for label, key in [
    ('pool_XEL (total XEL pool)', f'pool_{XEL}'),
    ('tm_XEL (total mixed XEL)', f'tm_{XEL}'),
    ('tmc (total mixes)', 'tmc'),
    ('nc (note count)', 'nc'),
    ('pz (paused)', 'pz'),
    ('wfb (withdraw fee bps)', 'wfb'),
    ('afb (admin fee bps)', 'afb'),
]:
    try:
        res = read_key(MIXER, key)
        if 'result' in res and res['result'].get('data'):
            d = res['result']['data']
            print(f'OK  {label:28s} = {d}')
        else:
            print(f'--  {label:28s} = (never written: {res.get("error", {}).get("message", "no data")})')
    except Exception as e:
        print(f'ERR {label:28s} = {e}')

# Compare: old mixer should still exist but is orphaned
try:
    res = read_key(OLD_MIXER, 'pc')
    print(f'\nOld mixer r5 (d384649c…) pc key: {res.get("result", {}).get("data", "n/a")} (orphaned v1)')
except Exception as e:
    print(f'\nOld mixer read: {e}')

# XUSD pool too
try:
    res = read_key(MIXER, f'pool_{XUSD}')
    d = res.get('result', {}).get('data') if 'result' in res else None
    print(f'pool_xUSD = {d}')
except Exception as e:
    print(f'pool_xUSD ERR: {e}')
