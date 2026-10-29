# RaiseRadar

Every Indian funding round, turned into who is likely to hire, and what to say.

**Status: live at https://raiseradar-woad.vercel.app with 15 reviewed real deals. A 50-item extraction evaluation is reported below.**

## Wedge

- Best existing tools: [Entrackr weekly funding reports](https://entrackr.com) and [Inc42 Datalabs](https://inc42.com/datalabs/).
- They report the deal and stop. RaiseRadar adds, per round: predicted roles with a stated reason, a suggested channel, a three-line tailored outreach note, and a link to the source.

## What it does

1. **Ingest** (`/api/ingest`, daily Vercel Cron): reads the RSS/Atom feeds you list in `FEED_URLS`, extracts company, amount, stage, investors, sector, city, date and use of funds with an LLM against a fixed, validated schema.
2. **Hiring signals**: from stage, sector and stated use of funds, predicts up to five roles. Each carries a reason and a low/medium/high confidence.
3. **Outreach kit**: three-line note, suggested channel, and a search link for the founder's public profile.
4. **Filters** by city, sector, stage and role; a **weekly brief** (`/brief`) whose counts are computed in code, with the LLM only phrasing them.

## Honesty and compliance

- Hiring signals are **predictions, not confirmed openings**. The UI says so.
- Only **extracted facts and the source link** are stored. Article text is never saved. Feed snippets are held in memory during extraction only.
- **Feed terms:** add a feed to `FEED_URLS` only after confirming its terms permit reuse. This repo ships with no feeds configured.
- The "find founder" link is a plain search URL. The app does not scrape LinkedIn or guess profile URLs.
- Rows flagged `is_sample` are shown with a **SAMPLE DATA** badge. No usage figures appear here; any future figures will come from real analytics only.

## Setup

```bash
npm install
cp .env.example .env.local     # fill in values
# Supabase SQL editor: run supabase/schema.sql
npm run dev
```

Trigger an ingest locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/ingest
```

Deploy to Vercel (personal account), set the same environment variables, and `vercel.json` schedules the ingest.

`GEMINI_MODEL` is intentionally not hard-coded. Set it to a model your Google AI Studio key can use. Switch provider with `LLM_PROVIDER=anthropic` (needs `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`).

## Evaluation

Target (from the master plan): extraction accuracy above 95% on 50 hand-labelled deals.

**50-item evaluation (run 2026-10-29, live extraction endpoint):** 50 items taken from Entrackr weekly funding reports (Sep 7 to Oct 17, 2026): 38 funding rounds with a stated amount, 7 rounds with an undisclosed amount, 5 non-funding items (leadership changes, an acquisition, a stake purchase). Labels were written by the project author from the same report entries, with no second labeller, and the inputs are short condensed summaries, which are easier than full articles.

| Field | Accuracy |
| --- | --- |
| is_funding_round | 100% (50/50) |
| company | 100% |
| amount (within 1%) | 100% |
| city | 100% |
| announced date | 100% |
| stage, strict (null label vs "Other") | 54% |
| stage, "Other" treated as not stated | 100% |
| All fields correct, strict | 54% (27/50) |
| All fields correct, "Other" = not stated | 100% (50/50) |

The strict stage miss is a labelling convention, not a wrong stage: when a report does not state the round, I labelled it null while the model returns the schema value "Other". Both numbers are shown so the choice is visible. Treat the 100% as an upper bound: small, easy, same-author labels. Per-item results are in `eval/results.json`; source links point to the Entrackr weekly reports. The live `/method` page also shows a running figure from reviewed deals.

To reproduce:

1. Copy `eval/labelled.template.json` to `eval/labelled.json`.
2. Label at least 50 real deals by hand (title, snippet, source link, expected fields).
3. Run `npm run eval`. It reports per-field and all-fields-correct accuracy and writes `eval/results.json`.

`eval/labelled.json` is git-ignored because it holds third-party article snippets. Publish the scores and the source links, not the text.

## Safety checks

```bash
npm run secret-scan   # pattern scan, run before every push
npm run typecheck
```

Also run [gitleaks](https://github.com/gitleaks/gitleaks) in CI before making the repo public.

## Secrets

- Keys exist only as environment variables. Production values are set in Vercel as Sensitive variables, never in the repo.
- A git pre-commit and pre-push hook plus a CI scan block pushes that contain key patterns.
- Only the public Supabase anon key reaches the browser. Row-level security allows read-only access; writes need the server-side service key.
- The ingest endpoint requires a secret bearer token and compares it in constant time.
- Restrict the Gemini key by quota in Google AI Studio and rotate any key you suspect has leaked.

## Copyright

Copyright (c) 2026 Divyansh Srivastava. All rights reserved. Developed by Divyansh Srivastava.
The source is published for viewing and evaluation only; see `LICENSE`. Not legal advice.

## Known limits

- Extraction quality depends on how much the feed includes. Many feeds give only a short summary, so city, investors or use of funds may be missing. Missing fields stay empty rather than guessed.
- The channel suggestion is a model suggestion, not a verified fact.
- The first version runs one source type (RSS/Atom). Public company announcements are a later addition.

## Private console and extra pages

- `/admin` (password from `ADMIN_PASSWORD`, at least 16 characters): paste a public report, extract facts, correct them, publish with hiring signals. Only facts and the source link are stored.
- `/deal/[id]`: full outreach kit and a personalised note generator (daily cap `NOTE_DAILY_CAP`).
- `/insights`, `/method` (accuracy measured from reviewed deals against the model's first extraction), `/api/export` (CSV).

Hiring signals are predictions, not confirmed openings. Probability, not proof. Not legal or financial advice.

Read the one-page [case study](CASE_STUDY.md).
