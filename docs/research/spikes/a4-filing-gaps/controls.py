"""Stricter controls than the pre-registered benchmark. Added AFTER a positive result,
deliberately in the conservative direction — these can only make the finding look worse."""
import json, collections, statistics, pathlib
MON = {m: i+1 for i, m in enumerate(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'])}
pdate = lambda s: (lambda d,m,y: f'{y}-{MON[m.upper()]:02d}-{int(d):02d}')(*s.split('-'))
LIQ, H = 20_000_000, 20

events = json.loads(pathlib.Path('events.json').read_text())
bars = json.loads(pathlib.Path('bars.json').read_text())
sessions, index = {}, {}
for sym, rows in bars.items():
    rows = sorted(rows, key=lambda r: r['t'])
    sessions[sym] = [{'d': r['t'][:10],'o': r['o'],'c': r['c'],'v': r['v'],'vw': r.get('vw') or r['c']} for r in rows]
    index[sym] = {s['d']: i for i, s in enumerate(sessions[sym])}

# every (symbol, session) that is liquid, with its forward return — the control pool
pool, by_date = [], collections.defaultdict(list)
for sym, ss in sessions.items():
    for i in range(len(ss)-1-H):
        e = ss[i+1]['o']
        if e <= 0: continue
        adv = statistics.median([s['vw']*s['v'] for s in ss[max(0,i-20):i+1]] or [0])
        if adv <= LIQ: continue
        r = (ss[i+1+H]['c']-e)/e*100
        pool.append(r); by_date[ss[i]['d']].append(r)

byday = collections.defaultdict(set)
for e in events: byday[(e['ticker'], pdate(e['filed']))].add(e['acc'])
multi, dates = [], []
for (sym, date), accs in byday.items():
    if len(accs) < 2: continue
    ss = sessions.get(sym)
    if not ss: continue
    i = index[sym].get(date)
    if i is None:
        c = [j for j, s in enumerate(ss) if s['d'] <= date]
        if not c: continue
        i = c[-1]
    if i+1+H >= len(ss) or ss[i]['c'] <= 0: continue
    e = ss[i+1]['o']
    if e <= 0: continue
    adv = statistics.median([s['vw']*s['v'] for s in ss[max(0,i-20):i+1]] or [0])
    if adv <= LIQ: continue
    multi.append((ss[i+1+H]['c']-e)/e*100); dates.append(ss[i]['d'])

def line(label, v):
    print(f'{label:<40} n={len(v):>7}  median {statistics.median(v):+6.2f}%  '
          f'mean {statistics.mean(v):+6.2f}%  win {sum(1 for x in v if x>0)/len(v)*100:5.1f}%')

print('CONTROL 1 — liquidity-matched benchmark\n')
line('liquid multi-insider events', multi)
line('all liquid stock-days (control)', pool)
print()
print('CONTROL 2 — date-matched: same days the filings landed\n')
dm = [r for d in dates for r in by_date.get(d, [])]
line('liquid multi-insider events', multi)
line('all liquid stocks, SAME dates', dm)
print()
print('Excess over date-matched control:')
print(f'  median {statistics.median(multi)-statistics.median(dm):+.2f}pp   '
      f'mean {statistics.mean(multi)-statistics.mean(dm):+.2f}pp   '
      f'win {sum(1 for x in multi if x>0)/len(multi)*100 - sum(1 for x in dm if x>0)/len(dm)*100:+.1f}pp')
