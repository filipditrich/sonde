import json, collections, statistics, pathlib
from datetime import datetime

MON = {m: i+1 for i, m in enumerate(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'])}
def pdate(s):
    d, m, y = s.split('-'); return f'{y}-{MON[m.upper()]:02d}-{int(d):02d}'

events = json.loads(pathlib.Path('events.json').read_text())
bars = json.loads(pathlib.Path('bars.json').read_text())

# per-ticker ordered sessions
sessions, index = {}, {}
for sym, rows in bars.items():
    rows = sorted(rows, key=lambda r: r['t'])
    sessions[sym] = [{'d': r['t'][:10], 'o': r['o'], 'c': r['c'], 'v': r['v'], 'vw': r.get('vw') or r['c']} for r in rows]
    index[sym] = {s['d']: i for i, s in enumerate(sessions[sym])}

# collapse to (ticker, filing date) with insider count + value
byday = collections.defaultdict(lambda: {'accs': set(), 'value': 0.0})
for e in events:
    k = (e['ticker'], pdate(e['filed']))
    byday[k]['accs'].add(e['acc']); byday[k]['value'] += e['value']

def gap_after(sym, date):
    """close on/before `date` -> open of the NEXT session. Returns (gap%, dollar volume)."""
    ss = sessions.get(sym)
    if not ss: return None
    i = index[sym].get(date)
    if i is None:                                  # filing on a non-trading day
        cand = [j for j, s in enumerate(ss) if s['d'] <= date]
        if not cand: return None
        i = cand[-1]
    if i + 1 >= len(ss): return None
    prev, nxt = ss[i], ss[i+1]
    if prev['c'] <= 0: return None
    adv = statistics.median([s['vw'] * s['v'] for s in ss[max(0, i-20):i+1]] or [0])
    return (nxt['o'] - prev['c']) / prev['c'] * 100, adv

rows = []
for (sym, date), meta in byday.items():
    g = gap_after(sym, date)
    if g is None: continue
    rows.append({'sym': sym, 'date': date, 'gap': g[0], 'adv': g[1],
                 'insiders': len(meta['accs']), 'value': meta['value']})

# baseline: every overnight gap for the same tickers, excluding filing dates
filing_days = {(r['sym'], r['date']) for r in rows}
base = []
for sym, ss in sessions.items():
    for i in range(len(ss) - 1):
        if (sym, ss[i]['d']) in filing_days: continue
        if ss[i]['c'] <= 0: continue
        adv = statistics.median([s['vw'] * s['v'] for s in ss[max(0, i-20):i+1]] or [0])
        base.append({'gap': (ss[i+1]['o'] - ss[i]['c']) / ss[i]['c'] * 100, 'adv': adv})

def summarise(label, data, key='gap'):
    if not data: print(f'{label:<34} (no data)'); return
    g = sorted(abs(d[key]) for d in data)
    n = len(g)
    q = lambda p: g[min(n-1, int(n*p))]
    over = lambda t: sum(1 for x in g if x > t) / n * 100
    print(f'{label:<34} n={n:>6}  med={q(.5):5.2f}%  p75={q(.75):5.2f}%  p90={q(.90):5.2f}%  '
          f'p99={q(.99):6.2f}%  |  >2%={over(2):5.1f}%  >4%={over(4):5.1f}%  >6%={over(6):5.1f}%')

LIQ = 20_000_000  # $20m median daily dollar volume — a plausible Sonde universe floor
print('ABSOLUTE overnight gap, close(filing day) -> open(next session)\n')
summarise('ALL filing events', rows)
summarise('  liquid only (>$20m ADV)', [r for r in rows if r['adv'] > LIQ])
summarise('  single insider', [r for r in rows if r['insiders'] == 1])
summarise('  multi-insider (2+)', [r for r in rows if r['insiders'] > 1])
summarise('  multi-insider AND liquid', [r for r in rows if r['insiders'] > 1 and r['adv'] > LIQ])
print()
summarise('BASELINE all non-filing days', base)
summarise('  baseline liquid only', [b for b in base if b['adv'] > LIQ])
json.dump(rows, open('gaps.json', 'w'))
