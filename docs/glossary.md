# Glossary

Terms used across these docs, written for someone who builds software but has not traded. Where a
term has a specific meaning inside Sonde that differs from general usage, that is called out.

## Market structure

**Order book** — the live list of buy (bid) and sell (ask) offers for an instrument. The best bid
and best ask define the current market.

**Spread** — the gap between best bid and best ask. You cross it on every round trip, so it is a
tax on trading frequency. A strategy that is profitable before the spread is often not profitable
after it.

**Slippage** — the difference between the price you expected and the price you got. Grows with
order size and shrinks with liquidity.

**Liquidity** — how much you can trade without moving the price. Thin markets punish size.

**Market order / limit order** — a market order executes now at whatever price is available; a
limit order executes only at your price or better, and may never execute at all.

**Maker / taker** — a taker removes liquidity from the book (crosses the spread); a maker adds it.
Most venues charge takers more, and some pay makers.

**OHLCV** — open, high, low, close, volume: the standard candle/bar aggregation of price over an
interval.

**Perpetual (perp)** — a futures contract with no expiry, kept near spot price by a periodic
**funding rate** paid between longs and shorts.

**Basis** — the gap between a derivative's price and the spot price of its underlying.

## Positions and risk

**Long / short** — long profits when price rises; short profits when it falls.

**Flat** — holding no position. In Sonde, a valid signal direction: "I read this and it changes
nothing" is information.

**Position size** — how much capital is committed to one instrument. Sonde caps this in the risk
gate as a percentage of account equity.

**Drawdown** — the decline from a peak in account value. The metric that matters emotionally and
the one that ends most strategies.

**Kill switch** — a manual halt on all new orders. In Sonde it stops trading; it does not liquidate.

**Dead-man's switch** — an automatic halt when the engine stops sending heartbeats, so a hung
process cannot leave positions unmanaged.

**Idempotency key** — a client-generated order id that lets a retry be recognized as the same order.
Prevents a crash between submit and record from producing a double fill.

## Evaluation

**Backtest** — running a strategy over historical data. **For LLM-based systems this is
structurally unreliable** — see [ADR 0004](./decisions/0004-no-llm-backtests.md).

**Forward test / paper trading** — running live against real market data with simulated money. The
only honest evaluation available to Sonde, and still an optimistic one: paper fills assume you get
your price with no partial fills and no market impact.

**Look-ahead bias** — using information the strategy could not have had at that moment. The classic
form is a data-pipeline bug. The form that matters here is subtler: the model's own training data
contains the future relative to your test window.

**Survivorship bias** — evaluating over a universe that only contains things that still exist,
silently deleting the failures.

**Point-in-time** — data as it was known at a given moment, including subsequent revisions being
absent. Sonde enforces this with the `observed_at` / `occurred_at` split.

**Hit rate** — fraction of signals that were directionally correct at their stated horizon.

**Calibration** — whether stated confidence matches realized frequency. A well-calibrated analyst
that says 0.7 is right about 70% of the time. High hit rate with poor calibration is not usable for
sizing.

**Overfitting** — a configuration tuned until it describes past noise. In systematic trading, the
default outcome of unconstrained search rather than an exotic failure.

**Sharpe ratio** — return per unit of volatility. Widely quoted, easily inflated by short windows
and repeated trials.

## Sonde-specific

**Probe** — a single-purpose collector. Fetches, normalizes, deduplicates, timestamps. Never
interprets.

**Observation** — one normalized item from a probe, with both timestamps and a link to its
immutable raw payload.

**Signal** — typed analyst output: asset, direction, confidence, horizon, rationale, source ids.
Advisory. Never reaches a venue on its own.

**Triage / deep read** — the two analyst tiers. Triage is cheap, batched, and filters hard; deep
read is expensive and only sees what survives triage.

**Proposal** — an order the portfolio agent wants to place. Not an order yet.

**Gate decision** — the deterministic accept/reject applied to a proposal, always stored with a
reason. Rejections are rendered in the UI alongside fills.

**Reconciliation** — correcting local state against the venue, which is authoritative. Local state
is a cache, not a ledger.

**Shadow analyst** — a new prompt version scored live against real data without its signals
reaching order flow.

**Live gate** — the explicit, documented decision required before Sonde touches real money. Not a
config flag.
