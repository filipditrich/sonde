"""How often do qualifying events cluster by sector, and would the charter's cap bind?"""
import json, collections, statistics, pathlib
H = 20
ev = json.loads(pathlib.Path('liquid_multi.json').read_text())
sic = json.loads(pathlib.Path('sic.json').read_text())
for e in ev:
    s = sic.get(e['cik'], {})
    e['sic'] = (s.get('sic') or '')[:2] or '??'      # SIC major group = first 2 digits
    e['sicdesc'] = s.get('desc') or 'unknown'
ev.sort(key=lambda e: e['entry_date'])
dates = sorted({e['entry_date'] for e in ev})
pos = {d: i for i, d in enumerate(dates)}            # event-date ordinal, not sessions

print(f'events: {len(ev)}  ·  SIC major groups represented: {len({e["sic"] for e in ev})}\n')

print('Top sectors by event count')
cnt = collections.Counter((e['sic'], e['sicdesc']) for e in ev)
for (code, desc), n in cnt.most_common(8):
    print(f'  {code}  {desc[:46]:<46} {n:>4}  ({n/len(ev)*100:4.1f}%)')
top = cnt.most_common(1)[0]
print(f'\n  most concentrated single sector: {top[1]/len(ev)*100:.1f}% of all events')

# --- simulate the charter's rules, walking forward -------------------------------------
def simulate(cap):
    open_pos, taken, blocked, peak = [], 0, 0, collections.Counter()
    for e in ev:
        d = e['entry_date']
        open_pos = [p for p in open_pos if p['exit'] > d]
        same = sum(1 for p in open_pos if p['sic'] == e['sic'])
        if cap is not None and same >= cap:
            blocked += 1; continue
        idx = pos[d]
        exit_d = dates[min(idx + H, len(dates)-1)]
        open_pos.append({'sic': e['sic'], 'exit': exit_d, 'ret': e['ret']})
        taken += 1
        peak[e['sic']] = max(peak[e['sic']], sum(1 for p in open_pos if p['sic'] == e['sic']))
    return taken, blocked, peak

print('\nWould the sector cap bind?')
for cap in [None, 6, 4, 3, 2]:
    taken, blocked, peak = simulate(cap)
    label = 'no cap' if cap is None else f'cap {cap}'
    extra = f'  max concurrent in one sector: {max(peak.values())}' if cap is None else ''
    print(f'  {label:<8} taken {taken:>4}  blocked {blocked:>3} ({blocked/len(ev)*100:4.1f}%){extra}')

# --- exploratory: does sector co-occurrence predict outcome? ---------------------------
print('\nEXPLORATORY — outcome by how many same-sector events landed in the prior 20 sessions')
by_sic_date = collections.defaultdict(list)
for e in ev: by_sic_date[e['sic']].append(e)
buckets = collections.defaultdict(list)
for s, group in by_sic_date.items():
    group.sort(key=lambda e: e['entry_date'])
    for i, e in enumerate(group):
        idx = pos[e['entry_date']]
        prior = sum(1 for g in group[:i] if idx - pos[g['entry_date']] <= H)
        buckets['isolated (0 prior)' if prior == 0 else
                'clustered (1-2 prior)' if prior <= 2 else 'heavy (3+ prior)'].append(e['ret'])
for k in ['isolated (0 prior)', 'clustered (1-2 prior)', 'heavy (3+ prior)']:
    v = buckets.get(k, [])
    if len(v) < 25: print(f'  {k:<24} n={len(v)} — too few'); continue
    print(f'  {k:<24} n={len(v):>4}  median {statistics.median(v):+6.2f}%  '
          f'win {sum(1 for x in v if x>0)/len(v)*100:5.1f}%')
print('\n  (exploratory: a new slice, not pre-registered — treat as a hypothesis)')
