---
name: travel-deals
description: Monitor flight and hotel deals from Melbourne (MEL Tullamarine + AVV Avalon). On-demand searches and scheduled watchlist alerts via LetsFG/FlightPowers/Amadeus MCP. Booking only after explicit user confirmation.
---

# travel-deals

Search and monitor flight + hotel deals from Melbourne. The skill CLI keeps
state and formats output; YOU (the agent) perform all searches via MCP tools.

## Commands (run in this skill's directory)

- `node dist/index.js watch add <DEST> [--kind flight|hotel] [--from MEL,AVV] [--dates 2027-05] [--threshold 450]`
- `node dist/index.js watch list [--json]`
- `node dist/index.js watch remove <id>`
- `node dist/index.js record <id>` — pipe `{"best_price_aud":N,"per_origin":{"MEL":N,"AVV":N},"result_count":N}`
- `node dist/index.js evaluate <id>` — prints Verdict JSON; pins alerts automatically
- `node dist/index.js format [--title "..."]` — pipe `{"deals":[...]}`, prints markdown

## Search protocol (on-demand)

1. Unless the user pins one airport, run `letsfg` `search_flights` for BOTH
   `MEL` and `AVV` for the requested route/dates. Merge results.
2. Normalize each result into a Deal for `format`:
   `{kind:"flight", origin, destination, price_aud, airline_or_property, stops, depart_at, deep_link, source:"letsfg"}`
   Convert non-AUD prices to AUD and set `price_aud`.
3. Optional cross-check: ONE `flightpowers` search on the best route, max 5
   per day total. Skip silently on quota errors.
4. Flexible dates ("May-ish")? Call `amadeus` `cheapest_dates` once per
   origin before searching, then run `node dist/index.js budget record
   amadeus` once per call. Keep the monthly total well under 2,000 —
   check `budget status` first and skip analytics above 1,800.
5. Pipe deals to `format` and reply with its markdown. Always show both
   airports when both were searched.

## Watchlist scan (scheduled)

For each watch from `watch list --json`: run step 1 (both origins unless the
watch pins one), `record`, then `evaluate`. Reply ONLY if verdict is `alert`,
showing the deal and why (`reason`). Silent otherwise. If ANY connector
fails, send one short status line naming it.

## Booking gate

- `booking_enabled` is `false` until the user turns it on (`config set
  booking_enabled true`).
- NEVER call `book_flight`/`book_hotel` unless: (a) booking_enabled is true,
  AND (b) the user replied to a specific displayed offer with explicit
  confirmation ("book it", "yes, book that one"). Re-verify the live price
  with `get_flight_results` first and state the final total in your reply.
- Never output, log, or store card numbers. Vaultwarden-fetched credentials
  are used transiently at checkout and discarded.

## Errors

- 429/quota: back off once, degrade to remaining sources, say which dropped.
  Never retry-loop.
- Connector auth errors: tell the user which connector needs re-consent
  (letsfg: one-tap at letsfg.co/connect; flightpowers: Google sign-in).
