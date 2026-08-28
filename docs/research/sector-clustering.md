# Sector clustering of qualifying events

**Date:** 2026-08-27 · **Scripts:** [`spikes/a4-filing-gaps/sector_clustering.py`](./spikes/a4-filing-gaps/sector_clustering.py)

Tests the two correlation-group numbers in [`../strategy/charter.md`](../strategy/charter.md), both
of which were guesses. One was wrong and the other was redundant.

**Sample:** all 574 liquid multi-insider events across both study windows (2023 Q3 – 2026 Q1).
Sector = **SIC major group** (first two digits), fetched from `data.sec.gov` submissions — free,
official, and on an endpoint the filing probe already uses. 328 issuers resolved.

Pooling both windows is legitimate here: clustering frequency is a descriptive property of the
filing stream, not a performance claim.

## Concentration is real

| SIC | Sector                        | Events |     Share |
| --- | ----------------------------- | -----: | --------: |
| 28  | Pharmaceutical Preparations   |     74 | **12.9%** |
| 73  | Services — Business Services  |     59 |     10.3% |
| 67  | Real Estate Investment Trusts |     53 |      9.2% |
| 13  | Crude Petroleum & Natural Gas |     43 |      7.5% |
| 60  | National Commercial Banks     |     34 |      5.9% |

51 major groups appear, but **the top three account for 32.4% of all qualifying events.** Insider
buying is not evenly spread — it concentrates in pharma, business services, and REITs.

## The cap binds, and the guess was too tight

Walk-forward simulation over all 574 events, applying the charter's rules in date order:

| Cap      | Trades taken |   Blocked |                                     |
| -------- | -----------: | --------: | ----------------------------------- |
| **none** |          574 |        0% | **max concurrent in one sector: 9** |
| 6        |          548 |  **4.5%** |                                     |
| 4        |          485 | **15.5%** | ← the charter's guess               |
| 3        |          434 |     24.4% |                                     |
| 2        |          359 |     37.5% |                                     |

Two things fall out.

**A cap is genuinely needed.** Uncapped, the book reaches **nine concurrent positions in one
sector**. Against ~14 expected concurrent positions that is roughly 64% of the portfolio in a single
SIC group — one bet wearing fourteen hats.

**Four was too tight.** It rejects **15.5%** of a signal that only fires 3.4 times a week. Six
blocks 4.5% while still holding worst-case sector concentration to ~43% of the book. For a sparse
signal, giving up 15.5% of it to move concentration from 43% to 29% is a poor trade.

> **Charter change: max positions per SIC major group 4 → 6**, on measured basis rather than taste.

## The second cap was redundant

The charter also carried _"max exposure per SIC major group: 6% of equity."_ At ~1.3% per position,
six positions is ~7.8% — so the 6% exposure cap would bind **before** the position cap, making the
position cap dead code and the effective sector limit 4 positions after all.

Two caps that disagree is a bug waiting to be written. **The exposure cap is removed**; position
count is the single sector rule. If sizing ever stops being roughly uniform, this needs revisiting.

## Exploratory — isolated events look better, but the shape is wrong

Outcome by how many same-sector events landed in the prior 20 sessions:

| Cohort                |   n |     median |       win |
| --------------------- | --: | ---------: | --------: |
| Isolated (0 prior)    | 164 | **+2.92%** | **63.4%** |
| Clustered (1–2 prior) | 200 |     +1.38% |     54.0% |
| Heavy (3+ prior)      | 210 |     +1.93% |     61.0% |

Isolated events look markedly better — which would give the sector cap a second justification, since
capping concentration tilts the book toward isolated events.

**But the pattern is not monotonic.** A real isolation premium should decay as clustering increases;
instead "heavy" beats "clustered." That shape is what noise looks like, and this is a fresh
unregistered slice on top of a dataset already sliced many times.

**Not acted on.** Recorded as a hypothesis worth a pre-registered test later, and explicitly not a
reason to change entry rules now.

## What changed

| Charter rule                | Was                    | Now                                       |
| --------------------------- | ---------------------- | ----------------------------------------- |
| Max positions per SIC group | 4 _(guess)_            | **6** _(measured — blocks 4.5% vs 15.5%)_ |
| Max exposure per SIC group  | 6% of equity _(guess)_ | **Removed** — redundant and contradictory |
