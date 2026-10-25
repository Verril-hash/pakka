# Pakka

> **🌐 Live site: [pakka-alpha.vercel.app](https://pakka-alpha.vercel.app)**
>
> **🎬 Demo video: [Watch on Google Drive](https://drive.google.com/file/d/1aivjxC8qQ8vMaA5538i5Q3FdH_blYgxT/view?usp=sharing)**

**Rent straight from the owner in Bengaluru. Zero brokerage, and faster.**

Pakka's team verifies every owner and flat in person. Voice agents built on [Bolna](https://bolna.ai) do the rest: they talk to tenants, call owners to confirm the flat and get the real details, call the tenant back, and book the visit, in English, Hindi, Kannada or Tamil. Free for tenants; owners list for free and pay only when Pakka finds their tenant.

## How it works

1. **A tenant talks to Pakka**: "Call me now" on the website (signed in), or a call to Pakka's number. **Pakka Line** asks what they need and searches verified flats mid-call.
2. **Pakka checks with the owners.** **Pakka Check** calls each owner in their language: still available? rent and deposit? owner or broker? who can stay, house rules, the tenant's own question, and a visit day and time. Bolna extracts 13 fields from every owner call, and the listing updates itself (rented flats are hidden, brokers flagged, changed rent saved).
3. **Pakka calls the tenant back** with the owners' answers and books the visit.
4. **WhatsApp follow-up** from the same number: visit details to the tenant and owner, the flats discussed after a callback, a "Reply CALL" nudge after a missed call, and a go-live note to new owners.

## What's in the box

- **Voice agents** (`agents/`): Pakka Check (owners) and Pakka Line (tenants: intake and callback). gpt-5.4-mini, Soniox stt-rt-v5 speech-to-text, Sarvam Bulbul v3 "Priya" voice in every language. Prompts tuned from real calls: one question at a time, re-asks anything talked over, handles "can you hear me?", follows the caller's language, never invents a time or price.
- **Website** (`web/`, React + Vite + Tailwind):
  - Public site with a real recorded owner call, a synced transcript and a live "What Pakka noted" panel, plus verified flats.
  - **Tenants:** flats matched to their budget and household, booking, "Call me now", visits, calls with recordings.
  - **Owners:** their flats, rent updates, mark rented, remove, list another flat, check-in calls and visits.
  - **New owners:** sign up, send their first flat, see "Pending verification" until the team visits and approves.
  - **Team console** (internal): live calls, listings and map, owner requests (approve & list), visits, owners, calls, agents.
- **Server** (`server/`): Node. Bolna mid-call functions, the owner-check and callback loop, Bolna and WhatsApp webhooks, APIs, sign-in.

## Architecture

```
Browser ──► Vercel (web app) ──/api──► Cloud Run: Node server ──► Firestore
                                          ▲   │
             Bolna voice agents ──tools/webhooks   └──► Vobiz WhatsApp API
```

- **Cloud Run** (asia-south1) runs the server, a single instance that sleeps when idle; **Firestore** holds all state; **Vercel** serves the site and proxies `/api`.
- **Bolna** places and receives calls on Pakka's number, calls the server's functions mid-call, and posts call updates to a webhook.
- **Vobiz** sends WhatsApp templates from the same number and posts replies to a signed webhook.

## Layout

```
agents/   Bolna agent definitions: prompts, voices, languages, extraction fields
server/   Node server: functions, call loop, APIs, sign-in, guard, WhatsApp
scripts/  Sync agents and extractions, test calls, inbound link, WhatsApp setup
lib/      Bolna API client
web/      React + Vite + Tailwind app
data/     Seed listings (data/db.json is local-only and git-ignored)
```

## Run locally

```bash
cp .env.example .env              # fill in values (never commit .env)
npm install && npm --prefix web install
npm run agent:sync -- check       # create/update the owner agent
npm run agent:sync -- line        # create/update the tenant agent
npm run extractions:sync          # owner-call extraction fields
npm run web:build
npm start                         # http://localhost:8787 (local data in data/db.json)
```

Bolna has to reach the server for live calls: use the Cloud Run URL (or a tunnel such as `cloudflared tunnel --url http://localhost:8787`) as `PUBLIC_URL`, then sync the agents again.

## Useful commands

| Command | What it does |
|---|---|
| `npm run deploy` | Build and deploy the server and web app to Cloud Run |
| `npm run agent:sync -- check\|line` | Push agent prompts and settings to Bolna |
| `npm run call:test -- +91… [en\|hi\|kn\|ta]` | Place a test owner call |
| `npm run inbound:link` | Route incoming calls on Pakka's number to Pakka Line |
| `npm run wa:setup -- channel\|templates\|status\|webhook\|test` | Set up and check WhatsApp on Vobiz |

The phone carrier is one setting: `PAKKA_CARRIER=twilio` (US number, 8 kHz audio) or `vobiz` (+91 number). It sets the provider and audio format for every language.

## Security

- **Sign-in:** Firebase Auth (Google or phone) plus a verified +91 phone number for every account. The server verifies Firebase tokens and issues its own httpOnly session, stored only as a hash.
- **App Check** (reCAPTCHA Enterprise) is enforced on Firebase sign-in and on the Pakka API, so only the real website gets in. The public Firebase key is restricted to Pakka's domains and the sign-in APIs.
- **Per-IP rate limits** on the API, keyed on the address Google's front end records (it can't be spoofed with headers).
- **Least access:** tenants and owners only ever see their own data; unverified owners see only their application; the team console needs a team session and is never linked publicly. "Call me" only ever calls the account's own verified number.
- **Webhooks:** Bolna's carry a secret token, and Vobiz's are HMAC-signed and verified.
- **Secrets** live in Google Secret Manager in production and in `.env` locally (git-ignored), never in the code or the container image.
