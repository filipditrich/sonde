# Spike A4 — insider-filing overnight gaps

Scripts that produced [`../../insider-filing-gap-study.md`](../../insider-filing-gap-study.md). Research
code, not product code: no tests, no error handling worth the name, kept for reproducibility.

## Reproduce

```bash
# 1. SEC structured Form 345 datasets — one zip per quarter, no per-filing fetching
curl -A "Sonde Research $SONDE_CONTACT_EMAIL" -O \
  https://www.sec.gov/files/structureddata/data/insider-transactions-data-sets/2026q1_form345.zip
# repeat for 2025q3, 2025q4; unzip NONDERIV_TRANS.tsv and SUBMISSION.tsv per quarter

python fetch_bars.py     # daily bars from Alpaca for every event ticker
python analyse.py        # absolute gap distribution vs baseline
python directional.py    # signed gap + 3-session forward return
python horizons.py       # forward return at 1/3/5/10/20 sessions
```

Requires `ALPACA_API_KEY_ID`, `ALPACA_API_SECRET_KEY`, `SONDE_CONTACT_EMAIL` in the environment.

## Why the structured datasets

The obvious approach — walk the EDGAR daily index and fetch each Form 4 — is roughly 120,000
requests for this sample. SEC publishes the same data pre-parsed as quarterly TSVs, including
transaction codes and tickers, which turns the whole collection step into three downloads.

Worth remembering when `packages/probes` is built: **the live path needs `getcurrent` for latency,
but any historical work should use the structured datasets.**
