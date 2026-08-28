# Source viability — first pass

**Date:** 2026-08-27 · **Method:** direct unauthenticated calls, no library, payloads read by hand.

Purpose: replace assumptions in [`docs/strategy/anatomy-of-a-trade.md`](../strategy/anatomy-of-a-trade.md)
with observed behaviour, **before** any spec depends on them. Findings that contradict the trace are
recorded as contradictions rather than quietly folded in.

---

## GDELT DOC 2.0 — confirmed usable

Keyless, instant, returns JSON.

```
GET api.gdeltproject.org/api/v2/doc/doc?query=bitcoin&mode=ArtList&maxrecords=3&format=json&timespan=1d
```

Per article: `url`, `title`, `seendate`, `domain`, `language`, `sourcecountry`, `socialimage`.

**Confirms Tier B (ADR 0011):** there is no article body in the response. Headline plus metadata is
what we get, and fetching the bodies would be the scraping we ruled out.

Two quirks worth designing around:

- `seendate` is GDELT's _observation_ time, not the publisher's. It maps to `observedAt`, and there
  is **no `occurredAt` in the payload** — it has to be parsed from the article or approximated.
- Titles carry spaced punctuation (`"... Bear Market Over ? "`), so title-similarity clustering
  needs normalisation before comparison.

### Syndication is immediate and obvious

The first two results of an unfiltered query were the same story:

| #   | Domain   | Title                                                                  | seendate  |
| --- | -------- | ---------------------------------------------------------------------- | --------- |
| 1   | fool.com | Bitcoin ETFs Are Now on Track For Their Best Month Since October 2025… | 20:30:00Z |
| 2   | aol.com  | Bitcoin ETFs Are Now on Track For Their Best Month Since October 2025… | 19:45:00Z |

Identical headline, two domains, 45 minutes apart, in a 3-record sample. No hunting required.

**Confirms the clustering requirement empirically.** It also shows the shape: syndication arrives
_spread over time_, not simultaneously, so a clustering window has to span at least an hour — and
the copy that reaches us _first_ is not necessarily the originating outlet.

---

## Kraken — the `venue` class exists, and it is two feeds

| Endpoint                               | HTTP | Carries                                                                     |
| -------------------------------------- | ---- | --------------------------------------------------------------------------- |
| `blog.kraken.com/feed`                 | 200  | **Listings** — "AVL is available for trading!"                              |
| `status.kraken.com/history.rss`        | 200  | **Delistings and incidents** — "Rain (RAIN) Delisting", "Beeks Maintenance" |
| `api.kraken.com/0/public/SystemStatus` | 200  | Exchange up/down only                                                       |

Listings and delistings arrive on **different feeds**, so the venue probe is two collectors, not one.

### ⚠️ Contradiction: there is no advance notice

Observed `pubDate` values:

```
Thu, 27 Aug 2026 15:10:13 +0000   AVL is available for trading!
Wed, 26 Aug 2026 20:29:20 +0000   USDSM is available for trading!
Wed, 26 Aug 2026 20:24:36 +0000   TMX is available for trading!
Wed, 26 Aug 2026 20:22:02 +0000   FOLD is available for trading!
Wed, 26 Aug 2026 20:17:57 +0000   PWT is available for trading!
```

Every title is present tense. **The announcement is the listing**, not notice of a future one — and
four assets listed inside twelve minutes on Aug 26, which also means listing events cluster.

`anatomy-of-a-trade.md` opens with `"Kraken will list XYZ on 2026-09-01. Deposits open 2026-08-30."`
That event shape **does not exist on this feed.** The trace assumed a pre-listing window to act in;
there is none.

What survives: the venue class is real, timely, and machine-readable. What changes: it is a
_coincident_ indicator, not a leading one. Any edge is in post-listing drift, not in anticipation.

> **Open:** do other venues give advance notice, and does a listing on one exchange predict a
> listing on another? That cross-venue lag would be a genuine leading indicator, and it is cheap to
> measure from these same feeds. **Next spike.**

---

## Bluesky — search is blocked, firehose is not

| Endpoint                                    | HTTP    | Note                                                |
| ------------------------------------------- | ------- | --------------------------------------------------- |
| `app.bsky.actor.getProfile`                 | 200     | reachable                                           |
| `app.bsky.feed.getAuthorFeed`               | 200     | reachable                                           |
| `app.bsky.feed.searchPosts`                 | **403** | generic HTML block page, not an AT Proto error      |
| `jetstream2.us-east.bsky.network/subscribe` | 400     | expected — WebSocket endpoint rejecting a plain GET |

The 403 returns an HTML block page rather than AT Protocol's usual JSON error, which points at an
edge/CDN rule on the search path rather than a missing-auth response. Other endpoints on the same
host answer normally, so it is not our network and not a general ban.

### This changes the `attention` class design

Search would have let us _query history_ — ask "what was mention volume for XYZ last week". The
firehose only lets us _subscribe forward_: filter the stream from now on and accumulate our own
counts.

Consequences, none of them fatal but all of them structural:

1. **There is no baseline until we have built one.** "8× the 7-day baseline" is meaningless until
   the firehose has run for at least seven days. The attention class has a **cold start measured in
   weeks**, and it must start collecting long before it can contribute to a thesis.
2. **Baselines must be stored, not computed on demand** — a rolling per-asset counter, persisted.
3. **Missed windows are gaps, permanently.** Downtime is unrecoverable history, so the collector
   needs to be the most reliable thing in the system, or the gaps need to be explicit in the data.

> **Assumes (unresolved):** that Bluesky carries enough crypto conversation for velocity to mean
> anything. Nothing here tests volume — the search block prevented exactly that measurement.
> Resolved by running a filtered firehose subscription for 24h and counting. **Next spike.**

---

## SEC EDGAR — requires a declared contact

Every SEC endpoint returns **403** with an _"Undeclared Automated Tool"_ page unless the `User-Agent`
declares a contact. Tested and rejected:

```
sonde-research/0.1 (+https://github.com/filipditrich/sonde)   403
Sonde Research https://github.com/filipditrich/sonde          403
Mozilla/5.0 (compatible; sonde-research/0.1)                  403
```

Both `www.sec.gov/Archives` and `data.sec.gov` behave identically. A repository URL does not satisfy
it — SEC's fair-access policy asks for a name and an **email address**, and the block is on the
declaration rather than on rate or IP.

This is not an obstacle to work around; it is the terms of access for a free, public, official
source, and it costs one config value. Declared contact lives in `SONDE_CONTACT_EMAIL` and is sent
by the shared fetch layer on every SEC request, alongside the 10 req/s ceiling.

> **Design note.** The politeness layer in [ADR 0011](../decisions/0011-source-acquisition-policy.md)
> now has a second job: per-source _identity_, not just per-source rate limiting. Some sources
> require the client to say who it is. The fetch layer should take a source profile — user agent,
> rate ceiling, conditional-request policy — rather than a single global config.

## Stooq — ruled out by our own policy

Stooq serves free daily OHLC CSVs and needs no key, which made it an obvious candidate for the
price half of the gap study. It now answers with a JavaScript **proof-of-work challenge**: the
client must brute-force a SHA-256 prefix and POST the nonce back before the CSV is served.

Defeating that is squarely Tier C under ADR 0011 — "defeating anti-bot measures" — so Stooq is out.
Not because it is hard, but because we wrote the rule.

> Worth noting as the policy working. The tempting move was a twenty-line PoW solver; the rule made
> that a non-decision, which is what a good rule does.

Price data therefore comes from **Alpaca**, which is the chosen venue anyway
([ADR 0014](../decisions/0014-equities-and-commodity-etfs-primary.md)) and whose free tier covers
IEX real-time plus everything older than fifteen minutes. It needs an API key, which is correct:
keyed access with terms beats keyless access we would have to defeat something to reach.

## Status of the trace's assumptions

| From the trace                                  | Status                                                       |
| ----------------------------------------------- | ------------------------------------------------------------ |
| GDELT returns metadata, not bodies              | ✅ Confirmed                                                 |
| Syndication requires clustering                 | ✅ Confirmed — found in a 3-record sample                    |
| Venue announcements are machine-readable        | ✅ Confirmed — two feeds, not one                            |
| Listings carry advance notice                   | ❌ **Refuted** — announcement is the listing                 |
| Attention baselines are queryable               | ❌ **Refuted** — subscribe-forward only, weeks of cold start |
| Crypto conversation exists on Bluesky at volume | ⏳ Untested — blocked by the search 403                      |
| On-chain exchange flows are freely available    | ⏳ Untested                                                  |
| Organic-vs-amplified is separable               | ⏳ Untested                                                  |
| 3-class theses beat 2-class                     | ⏳ Needs months of scoreboard data                           |

Two refutations in the first hour of looking, one of them to the opening premise of the trace. That
ratio is the argument for doing this before the specs, not after.
