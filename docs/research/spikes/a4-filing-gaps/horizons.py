import json, collections, statistics, pathlib
MON = {m: i+1 for i, m in enumerate(['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'])}
pdate = lambda s: (lambda d,m,y: f'{y}-{MON[m.upper()]:02d}-{int(d):02d}')(*s.split('-'))
events = json.loads(pathlib.Path('events.json').read_text())
bars = json.loads(pathlib.Path('bars.json').read_text())
sessions, index = {}, {}
for sym, rows in bars.items():
    rows = sorted(rows, key=lambda r: r['t'])
    sessions[sym] = [{'d': r['t'][:10],'o': r['o'],'c': r['c'],'v': r['v'],'vw': r.get('vw') or r['c']} for r in rows]
    index[sym] = {s['d']: i for i, s in enumerate(sessions[sym])}
byday = collections.defaultdict(set)
for e in events: byday[(e['ticker'], pdate(e['filed']))].add(e['acc'])

H = [1, 3, 5, 10, 20]
rows = []
for (sym, date), accs in byday.items():
    ss = sessions.get(sym)
    if not ss: continue
    i = index[sym].get(date)
    if i is None:
        c = [j for j, s in enumerate(ss) if s['d'] <= date]
        if not c: continue
        i = c[-1]
    if i + 1 + max(H) >= len(ss) or ss[i]['c'] <= 0: continue
    entry = ss[i+1]['o']
    if entry <= 0: continue
    adv = statistics.median([s['vw']*s['v'] for s in ss[max(0,i-20):i+1]] or [0])
    r = {'adv': adv, 'insiders': len(accs), 'gap': (entry-ss[i]['c'])/ss[i]['c']*100}
    for h in H: r[f'h{h}'] = (ss[i+1+h]['c'] - entry)/entry*100
    rows.append(r)

# market proxy: equal-weight mean across ALL tickers for the same windows = crude beta control
def line(label, data):
    if len(data) < 30: print(f'{label:<30} n={len(data)} — too few'); return
    out = f'{label:<30} n={len(data):>5} |'
    for h in H:
        v = [d[f'h{h}'] for d in data]
        win = sum(1 for x in v if x > 0)/len(v)*100
        out += f'  {h:>2}d med {statistics.median(v):+5.2f}% win {win:4.1f}% |'
    print(out)

LIQ = 20_000_000
print('Forward return from the next open, by horizon (sessions). Uncontrolled for market beta.\n')
line('liquid, all', [r for r in rows if r['adv'] > LIQ])
line('liquid, single insider', [r for r in rows if r['adv'] > LIQ and r['insiders'] == 1])
line('liquid, multi-insider', [r for r in rows if r['adv'] > LIQ and r['insiders'] > 1])
line('liquid, gap <= 4%', [r for r in rows if r['adv'] > LIQ and abs(r['gap']) <= 4])
line('illiquid, all', [r for r in rows if r['adv'] <= LIQ])
print()
# crude benchmark: same-window return of every ticker on every day, pooled
allr = collections.defaultdict(list)
for sym, ss in sessions.items():
    for i in range(len(ss)-1-max(H)):
        e = ss[i+1]['o']
        if e <= 0: continue
        for h in H: allr[h].append((ss[i+1+h]['c']-e)/e*100)
out = f'{"BENCHMARK all days pooled":<30} n={len(allr[1]):>5} |'
for h in H:
    v = allr[h]; win = sum(1 for x in v if x > 0)/len(v)*100
    out += f'  {h:>2}d med {statistics.median(v):+5.2f}% win {win:4.1f}% |'
print(out)
