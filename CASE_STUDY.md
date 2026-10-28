# RaiseRadar: case study

Copyright 2026 Divyansh Srivastava. All rights reserved. Developed by Divyansh Srivastava.

**Live:** https://raiseradar-woad.vercel.app

## Problem
A freshly funded startup hires within weeks, but the people who benefit, job seekers and sales teams, usually learn about the round late and have no idea which roles or needs follow. Existing funding trackers such as Entrackr and Inc42 Datalabs report the deal and stop.

## What I built
For each funding round, RaiseRadar shows the facts, a prediction of the roles the company is likely to hire for next (each with a stated reason and a confidence), a three-line starter note, and a link to the source. A personaliser rewrites the note for a job seeker or a seller from one line about themselves. Pages for market insights, a weekly brief, a CSV export and a method page with a measured accuracy score complete it.

## How it works
1. A person pastes the relevant text from a public report into a private console.
2. A language model extracts company, amount, stage, investors, sector, city, date and use of funds.
3. The person checks and corrects every field. Only the facts and the source link are stored, never the article text.
4. A second call predicts roles from stage, sector and stated use of funds. A code rule downgrades any "high" confidence unless the use of funds names that function.

Stack: Next.js, TypeScript, Tailwind, Supabase (row-level security, public read, writes only through a server key), Vercel, Gemini behind one wrapper with retries and a fallback model, and a 3D globe built with three.js.

## Decisions and trade-offs
- **No scraping.** Inc42 forbids automated access without written consent, so the data path is human-in-the-loop. The ingest job is built but disabled until a feed is approved. Permission requests are drafted.
- **Keys stay server-side.** Secrets live in environment variables; pre-commit and pre-push hooks and CI scan for them; the public key is limited by database policy.
- **Cost control.** Public note generation has a daily cap enforced in the database.
- **Honest measurement.** Accuracy is the share of fields where the model's first extraction equals the human-corrected value.

## Results so far
- 15 real deals from public reports, all reviewed, all with hiring signals.
- First-pass extraction matched the checked value on all five scored fields for 15 of 15 deals. This is an early number: the input was short summary text, the sample is small, and the target is 95% on 50 deals.
- Role predictions are not yet scored against real job postings.

## Bugs found by using it
- Extraction crashed when a deal named several founders; the schema now accepts a list.
- The model marked roles "high" confidence without support; a rule now enforces the stated standard.
- Overloaded model calls timed out the request; calls now retry within a fixed time budget.

## What I would do next
Reach 50 reviewed deals, score role predictions against real job postings one month later, and add an approved feed.

Hiring signals are predictions, not confirmed openings. Probability, not proof. Not legal or financial advice.
