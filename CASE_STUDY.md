# RaiseRadar: case study

**Problem.** Funding news tells you a company raised money. It does not tell a job seeker who is likely to hire next, for which roles, or what to say.

**Existing tools.** Entrackr weekly funding reports and Inc42 Datalabs report the deal and stop.

**What I built.** A daily pipeline that reads funding feeds, extracts each round into a fixed validated schema (company, amount, stage, investors, sector, city, date, use of funds), then adds up to five predicted roles with a stated reason and a low/medium/high confidence, a suggested channel and a three-line outreach note. Filters by city, sector, stage and role.

**Round two: end to end.** Added optional email sign-in and three audience paths. Job seekers paste a resume and get ranked companies; recruiters get a roles-in-demand board; sales users get account ranking with CSV export. All users can save companies into an outreach pipeline with status and notes, and opt into an email digest of new matches. Existing alternatives (Entrackr, Inc42 Datalabs, LinkedIn job alerts) report the deal or the posted job, not who has just funded a need that fits you.

**Decisions.**
- Hiring signals are labelled predictions, not confirmed openings.
- Only extracted facts and the source link are stored; article text is never saved.
- The app ships with no feeds configured, so the owner confirms each feed's terms first.
- The "find founder" link is a plain search URL. No scraping of profiles.

**Evidence.** 50 items from Entrackr weekly reports (Sep 7 to Oct 17, 2026), labelled by me. Funding-round detection, company, amount, city and date were each 100% (50/50). Strict all-fields accuracy was 54%, and 100% once "Other" is treated as "stage not stated". The gap is a labelling convention, and both numbers are published. Labels are single-author and the inputs are short summaries, so 100% is an upper bound.

**Match evidence.** 8 hand-described profiles over 38 real deals: MAP 86.7% and R-precision 78.2% versus 24.3% and 17.1% for a newest-first baseline. Labels were drafted by an AI assistant and not yet reviewed by a human second labeller. Weakest case: "healthtech" does not match deals tagged "healthcare" (no synonyms yet).

**Speed work.** The slow model now races a faster one; a repeat input returns from cache; the server runs in Mumbai next to the database.

**Limits.** 65 reviewed real deals live (13 Oct to 9 Nov 2026), all sourced from StartupTalky daily funding roundups. Single labeller. No live feeds until terms are confirmed.

**Next.** A second labeller, full-article inputs, and real usage analytics.

Live: https://raiseradar-woad.vercel.app
