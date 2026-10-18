# Pakka

**Every rental listing, verified by a call.** Pakka's team verifies each owner in person; voice agents built on [Bolna](https://bolna.ai) then keep every listing current with short calls in Kannada, Hindi, Tamil or English, and let tenants find and book a flat with one call.

## How it works

- **Pakka Check** (outbound voice agent) calls owners to confirm availability, rent, rules and a visit slot, and catches brokers. Thirteen fields are extracted after every call.
- **Pakka Line** (tenant voice agent) learns what a tenant needs, searches verified flats, and, when something needs checking, has Pakka Check call the owners and then calls the tenant back to book the visit.
- **Web app** (`web/`): public site, owner and tenant accounts, and an internal team console.

## Layout

```
agents/   Bolna agent definitions (prompts, voices, extraction fields)
server/   Node server: mid-call functions, owner-check loop, APIs, sign-in
scripts/  Create/update agents, place test calls
lib/      Bolna API client
web/      React + Vite + Tailwind app
data/     Seed listings (db.json is local-only and git-ignored)
```

## Run locally

```bash
cp .env.example .env            # fill in values
npm run agent:sync -- check     # create/update the owner agent
npm run extractions:sync        # owner-call extraction fields
npm --prefix web install
npm run web:build
npm start                       # http://localhost:8787
```

Live tenant calls need Bolna to reach the server: expose it (e.g. `cloudflared tunnel --url http://localhost:8787`), set `PUBLIC_URL`, then `npm run agent:sync -- line`.

## Security

- Secrets live only in `.env` (git-ignored). `data/db.json` holds phone numbers and call results and is git-ignored.
- Owners and tenants sign in with a phone number and one-time code and only ever receive their own data.
- The team console requires a team session (numbers in `TEAM_PHONES`) on every request; its code is loaded separately and never linked from the public site.
- One-time codes are currently printed to the server log (SMS/voice delivery is a single `deliver()` function in `server/auth.mjs`).
