# openclaw-travel-deals

> An OpenClaw skill for monitoring flight and hotel deals from Melbourne (MEL Tullamarine + AVV Avalon) via LetsFG, FlightPowers, and Amadeus MCP connectors.

*Based on [openclaw-supermarket-deals](https://github.com/benmillerat/openclaw-supermarket-deals) by Ben Miller.*

---

## What it does

- Searches and monitors flight and hotel deals originating from Melbourne (MEL / AVV).
- Coordinates LetsFG, FlightPowers, and Amadeus MCP tools.
- Maintains a local watchlist, records pricing history, and evaluates price drops/alerts.
- Strict booking gate: requires explicit user confirmation and `booking_enabled = true`.

---

## Requirements

- Node.js 18+
- OpenClaw gateway agent
- Amadeus API credentials (`AMADEUS_KEY`, `AMADEUS_SECRET`)

---

## Setup

```bash
git clone https://github.com/rahul-seo-geo/openclaw-travel-deals.git
cd openclaw-travel-deals
npm install
npm run build
```

---

## Environment Variables

- `AMADEUS_KEY`: Amadeus API client ID
- `AMADEUS_SECRET`: Amadeus API client secret
- `TRAVEL_DEALS_DATA`: Path to store watchlist and history data (defaults to `~/.openclaw-travel-deals`)

---

## Commands

- `node dist/index.js watch add <DEST> [--kind flight|hotel] [--from MEL,AVV] [--dates 2027-05] [--threshold 450]`
- `node dist/index.js watch list [--json]`
- `node dist/index.js watch remove <id>`
- `node dist/index.js record <id>`
- `node dist/index.js evaluate <id>`
- `node dist/index.js format [--title "..."]`
- `node dist/index.js config [get|set] <key> [value]`
- `node dist/index.js budget [status|check]`
