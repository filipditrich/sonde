# 0011: Source acquisition policy

## Status

Accepted (Milestone 1, 2026-08-27)

## Context

Sonde's premise is reacting to public data, so which sources it may use and how it may obtain them
is a load-bearing decision rather than an implementation detail. The repository is public and
carries the operator's name, which raises the cost of getting this wrong.

Surveying what is actually reachable produced a sharper split than "free vs paid": **sources that
hand us content** versus **sources we would have to take it from**.

The second category has hardened considerably. Reddit deprecated unauthenticated `.json` endpoints
in May 2026 (403 for unauthenticated requests, TLS fingerprinting and IP-reputation checks) and has
flagged RSS as the next surface to close — driven by conversation archives becoming an AI-training
licensing asset. X discontinued its free tier and moved to pay-per-use at roughly $0.005 per post
read; Nitter, the standard workaround, is dormant because X closed guest-token access and bound
tokens to browser fingerprints. Self-hosting Nitter now requires real account session tokens.

Two things follow. Adversarial scraping means maintaining a workaround against a well-funded
opponent who actively breaks workarounds — unpaid on-call for sources whose value is unproven. And
at $0.005 per post read, the entire monthly budget buys ~6,000 X reads and leaves nothing for
inference, so X is closed on cost alone regardless of policy.

Separately, social sources introduce a category the other sources do not: **text written by people
who may know a trading agent is reading it.**

## Decision

1. **Three tiers, by what the source hands over.**

   | Tier  | Definition                                           | Examples                                                                                                                                  |
   | ----- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
   | **A** | Content given to us deliberately                     | RSS/Atom with content, official APIs within ToS, exchange announcement feeds, SEC EDGAR, FRED, DefiLlama, Bluesky firehose, Farcaster     |
   | **B** | Metadata only — we store the reference, not the body | GDELT `ArtList` (headline + URL), GDELT `TimelineVol`/`TimelineTone` as numeric series                                                    |
   | **C** | Declined                                             | Anything requiring a burner account, defeating anti-bot measures, or paywalled/`robots.txt`-disallowed content; resellers of scraped data |

2. **No adversarial scraping.** If a platform actively defends against automated collection, we do
   not attempt to defeat that. This is an engineering judgement as much as a legal one: such probes
   break on every countermeasure update, and a broken probe is worse than an absent one.

3. **Use the free official path where one exists.** Reddit's OAuth API is free for non-commercial
   use at 100 queries/min — ample for Sonde. The friction is an approval queue, not money. Applying
   and waiting beats building a fragile workaround around an open door.

4. **X is not a source.** Closed on cost, and every free route to it is Tier C. Revisit only if
   pricing changes. Notable posts that move markets get reported by outlets we can read legitimately
   — later, but the reflexivity problem means the latency costs less than it appears to.

5. **Politeness commitments**, applied by the shared fetch layer rather than per probe:
   - a `User-Agent` identifying Sonde with a contact URL
   - `robots.txt` respected
   - `ETag` / `If-Modified-Since` on every poll
   - per-host token buckets, `Retry-After` honoured, exponential backoff

6. **Attacker-authored text is its own class.** Social and forum content is tagged
   `trustClass: 'adversarial'` on the `Observation`. It is delimited in prompts and never
   interpolated into instruction context. This is defence in depth — the property that makes it safe
   is that the reasoning plane has no venue access
   ([ADR 0005](./0005-llm-proposes-code-disposes.md)) — but the tag also lets the scoreboard segment
   performance by trust class, which is the interesting question anyway.

7. **Near-duplicate clustering happens before triage.** One wire story syndicated to forty outlets
   is one event. Observations carry an `eventClusterId` and the list of `outlets` that carried it,
   so outlet count becomes a feature rather than forty correlated signals and forty model calls.

8. **Fetched third-party content is never committed.** `data/` is gitignored. The repository holds
   code and docs.

## Consequences

- The loudest social source is unavailable, and no amount of engineering changes that. Accepted.
- Bluesky and Farcaster become the primary social inputs — open protocols, no key, no review, no
  quota. Less crowded than X, which is not obviously a disadvantage for a signal source.
- The Reddit OAuth application should be filed early; approval is slow and opaque.
- Tier B means GDELT contributes headlines and aggregate tone series rather than article bodies. The
  tone and volume series are usable directly as numeric features with no fetching at all.
- The politeness layer is shared infrastructure written once, in Milestone 1, rather than
  rediscovered per probe. Getting IP-banned from a free source is the most likely way a probe dies
  silently.
- Clustering must exist before the first analyst call or triage cost scales with syndication rather
  than with events.

## Milestones touched

- Milestone 1 (Ears)
- Milestone 2 (Opinion)

## References

- [Reddit unauthenticated JSON deprecation](https://crawlora.net/blog/reddit-json-api-blocked-2026)
- [GDELT DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)
- [ADR 0005](./0005-llm-proposes-code-disposes.md) — why adversarial input is survivable
