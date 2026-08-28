"""Out-of-sample test of Finding 4. Parameters frozen by PREREGISTRATION.md — do not tune."""
import json, collections, statistics, pathlib
MON = {m: i+1 for i, m in enumerate(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'])}
pdate = lambda s: (lambda d,m,y: f'{y}-{MON[m.upper()]:02d}-{int(d):02d}')(*s.split('-'))

LIQ, HORIZON = 20_000_000, 20          # frozen
events = json.loads(pathlib.Path('events.json').read_text())
bars = json.loads(pathlib.Path('bars.json').read_text())

sessions, index = {}, {}
for sym, rows in bars.items():
    rows = sorted(rows, key=lambda r: r['t'])
    sessions[sym] = [{'d': r['t'][:10],'o': r['o'],'c': r['c'],'v': r['v'],'vw': r.get('vw') or r['c']} for r in rows]
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
    if i + 1 + HORIZON >= len(ss) or ss[i]['c'] <= 0: continue
    entry = ss[i+1]['o']
    if entry <= 0: continue
    adv = statistics.median([s['vw']*s['v'] for s in ss[max(0,i-20):i+1]] or [0])
    rows.append({'adv': adv, 'insiders': len(accs),
                 'gap': (entry-ss[i]['c'])/ss[i]['c']*100,
                 'ret': (ss[i+1+HORIZON]['c']-entry)/entry*100})

bench = []
for sym, ss in sessions.items():
    for i in range(len(ss)-1-HORIZON):
        e = ss[i+1]['o']
        if e > 0: bench.append((ss[i+1+HORIZON]['c']-e)/e*100)

def stat(label, v):
    if len(v) < 30: print(f'{label:<34} n={len(v)} — too few'); return None
    med = statistics.median(v); win = sum(1 for x in v if x > 0)/len(v)*100
    print(f'{label:<34} n={len(v):>6}  median {med:+6.2f}%  win {win:5.1f}%  mean {statistics.mean(v):+6.2f}%')
    return med, win

print('OUT-OF-SAMPLE — 2023Q3 to 2025Q2, parameters frozen\n')
bm = stat('BENCHMARK all days pooled', bench)
print()
stat('all events', [r['ret'] for r in rows])
stat('liquid (>$20m ADV)', [r['ret'] for r in rows if r['adv'] > LIQ])
stat('liquid, single insider', [r['ret'] for r in rows if r['adv'] > LIQ and r['insiders'] == 1])
res = stat('liquid, MULTI-INSIDER  <-- the test', [r['ret'] for r in rows if r['adv'] > LIQ and r['insiders'] > 1])

print('\n' + '='*72)
if res and bm:
    med, win = res
    print(f'in-sample was:  median +2.13%  win 60.7%  (n=214)')
    print(f'out-of-sample:  median {med:+.2f}%  win {win:.1f}%   benchmark median {bm[0]:+.2f}% win {bm[1]:.1f}%')
    if med > bm[0] and win > 55:   verdict = 'SURVIVES — median beats benchmark and win rate > 55%'
    elif med > bm[0] and win >= 50: verdict = 'WEAK — direction holds, magnitude does not'
    else:                           verdict = 'FAILS — Finding 4 was noise'
    print(f'\nVERDICT (per pre-registered decision rule): {verdict}')
