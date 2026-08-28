import json, os, time, urllib.request, pathlib
UA = f"Sonde Research {os.environ['SONDE_CONTACT_EMAIL']}"
ev = json.loads(pathlib.Path('liquid_multi.json').read_text())
ciks = sorted({e['cik'] for e in ev})
p = pathlib.Path('sic.json')
sic = json.loads(p.read_text()) if p.exists() else {}
for n, cik in enumerate(ciks, 1):
    if cik in sic and sic[cik].get('sic'): continue
    try:
        with urllib.request.urlopen(urllib.request.Request(
                f'https://data.sec.gov/submissions/CIK{int(cik):010d}.json',
                headers={'User-Agent': UA}), timeout=30) as r:
            d = json.load(r)
        sic[cik] = {'sic': d.get('sic') or '', 'desc': d.get('sicDescription') or ''}
    except Exception as e:
        sic[cik] = {'sic': '', 'desc': f'ERR {e.__class__.__name__}'}
    time.sleep(0.11)
    if n % 100 == 0: p.write_text(json.dumps(sic)); print(f'  {n}/{len(ciks)}', flush=True)
p.write_text(json.dumps(sic))
print(f'resolved {sum(1 for v in sic.values() if v["sic"])}/{len(ciks)}')
