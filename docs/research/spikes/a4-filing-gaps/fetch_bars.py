import json, os, time, urllib.parse, urllib.request, pathlib

KEY, SEC = os.environ['ALPACA_API_KEY_ID'], os.environ['ALPACA_API_SECRET_KEY']
H = {'APCA-API-KEY-ID': KEY, 'APCA-API-SECRET-KEY': SEC}
tickers = json.loads(pathlib.Path('tickers_clean.json').read_text())
out, batch = {}, 100

def get(url):
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=90) as r:
                return json.load(r)
        except Exception as e:
            if attempt == 4: raise
            time.sleep(2 * (attempt + 1))

total_pages = 0
for i in range(0, len(tickers), batch):
    chunk = tickers[i:i+batch]
    token, pages = None, 0
    while True:
        q = {'symbols': ','.join(chunk), 'timeframe': '1Day', 'start': '2025-07-01',
             'end': '2026-04-30', 'feed': 'sip', 'limit': 10000, 'adjustment': 'split'}
        if token: q['page_token'] = token
        d = get('https://data.alpaca.markets/v2/stocks/bars?' + urllib.parse.urlencode(q))
        for sym, bars in (d.get('bars') or {}).items():
            out.setdefault(sym, []).extend(bars)
        token = d.get('next_page_token'); pages += 1; total_pages += 1
        if not token: break
    print(f'  {i+len(chunk):>5}/{len(tickers)} tickers · {pages} pages · {len(out)} with data', flush=True)

pathlib.Path('bars.json').write_text(json.dumps(out))
print(f'\ntickers with bars: {len(out)} / {len(tickers)}')
print(f'total bars: {sum(len(v) for v in out.values())} across {total_pages} requests')
