import json, collections, statistics, pathlib
from datetime import datetime
MON = {m: i+1 for i, m in enumerate(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'])}
pdate = lambda s: (lambda d,m,y: f'{y}-{MON[m.upper()]:02d}-{int(d):02d}')(*s.split('-'))

events = json.loads(pathlib.Path('events.json').read_text())
bars = json.loads(pathlib.Path('bars.json').read_text())
sessions, index = {}, {}
for sym, rows in bars.items():
    rows = sorted(rows, key=lambda r: r['t'])
    sessions[sym] = [{'d': r['t'][:10], 'o': r['o'], 'c': r['c'], 'v': r['v'], 'vw': r.get('vw') or r['c']} for r in rows]
    index[sym] = {s['d']: i for i, s in enumerate(sessions[sym])}

byday = collections.defaultdict(set)
for e in events: byday[(e['ticker'], pdate(e['filed']))].add(e['acc'])

rows = []
for (sym, date), accs in byday.items():
    ss = sessions.get(sym)
    if not ss: continue
    i = index[sym].get(date)
    if i is None:
        c = [j for j, s in enumerate(ss) if s['d'] <= date]
        if not c: continue
        i = c[-1]
    if i + 4 >= len(ss) or ss[i]['c'] <= 0: continue
    entry = ss[i+1]['o']
    if entry <= 0: continue
    adv = statistics.median([s['vw'] * s['v'] for s in ss[max(0,i-20):i+1]] or [0])
    rows.append({'sym': sym, 'gap': (entry - ss[i]['c'])/ss[i]['c']*100,
                 'fwd3': (ss[i+3]['c'] - entry)/entry*100, 'adv': adv, 'insiders': len(accs)})

def block(label, data):
    if len(data) < 30: print(f'{label:<32} n={len(data)} — too few'); return
    gaps = [d['gap'] for d in data]; fwd = [d['fwd3'] for d in data]
    up = sum(1 for g in gaps if g > 0)/len(gaps)*100
    against = sum(1 for g in gaps if g > 4)/len(gaps)*100   # long thesis: gapping UP hurts
    favour  = sum(1 for g in gaps if g < -4)/len(gaps)*100
    print(f'{label:<32} n={len(data):>5} | gap med {statistics.median(gaps):+5.2f}% mean {statistics.mean(gaps):+5.2f}% '
          f'| up {up:4.1f}% | >+4% (against) {against:4.1f}% | <-4% (in favour) {favour:4.1f}% '
          f'| fwd3 med {statistics.median(fwd):+5.2f}% mean {statistics.mean(fwd):+5.2f}%')

LIQ = 20_000_000
print('SIGNED gap and 3-session forward return from the entry price')
print('(code-P purchase = bullish thesis, so a POSITIVE gap means paying up)\n')
block('all events', rows)
block('liquid (>$20m ADV)', [r for r in rows if r['adv'] > LIQ])
block('liquid, single insider', [r for r in rows if r['adv'] > LIQ and r['insiders'] == 1])
block('liquid, multi-insider', [r for r in rows if r['adv'] > LIQ and r['insiders'] > 1])
print()
print('after a 4% gap guard (liquid only):')
block('  surviving theses', [r for r in rows if r['adv'] > LIQ and abs(r['gap']) <= 4])
block('  rejected by the guard', [r for r in rows if r['adv'] > LIQ and abs(r['gap']) > 4])
