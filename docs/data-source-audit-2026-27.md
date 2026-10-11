# 2026/27 data-source audit (11 October 2026)

Kickoff's target is the Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and UEFA Champions League. The budget is €0 and snapshots run twice a day. A successful API response is not independent evidence that its numbers are accurate.

| Source | Current-season coverage we can use | Missing or blocking issue | Decision |
| --- | --- | --- | --- |
| [football-data.org Free](https://www.football-data.org/pricing) | All six target competitions are in its [free coverage list](https://www.football-data.org/coverage). Fixtures, delayed results and standings. | Free plan does not include the statistics add-on or deep player data. | Keep for matches, schedules, standings, goals for and goals against. |
| [GOAL API](https://goal-api.com/documentation) | Top-scorer responses for all six competitions are already captured in `public/data/players.json`. | These responses contain only a subset of players and do not populate the requested advanced fields. The stored João Pedro row reports 5 league goals, while the [Premier League player page](https://www.premierleague.com/en/players/475168/jo%C3%A3o-pedro/career) showed 3 for 2026/27 when checked. The difference needs reconciliation against the same update time and competition scope. | Retain raw snapshot for investigation; do not publish it as a verified full player table. |
| [API-Football Free](https://api-sports.io/sports/football) | Key was tested in [this Actions run](https://github.com/Cattleyaaaaa/kickoff/actions/runs/38144622702). | Every 2026 season request returned `Free plans do not have access to this season, try from 2022 to 2024.` Six requests used. | Do not integrate into the current-season production sync. |
| [PitchAPI](https://pitchapi.dev/) | Authenticated checks found 2026/27 played matches and team, player and advanced-player stat keys in all six competitions. [Five-league audit](https://github.com/Cattleyaaaaa/kickoff/actions/runs/38151699807) used 21 calls; the [Bundesliga audit](https://github.com/Cattleyaaaaa/kickoff/actions/runs/38151948486) used 5. The Bundesliga sample, Augsburg 2–2 Bayern, agrees with the [Bundesliga match report](https://www.bundesliga.com/en/bundesliga/news/augsburg-bayern-munich-match-report-highlights-matchday-5-39487). | These are one-match samples per competition, not proof that every match and player has all fields. The provider documentation states free access, but we have not established permission to republish aggregated statistics. | Keep as a promising candidate; do not publish season tables until coverage and reuse terms are verified. |
| [OpenLigaDB](https://api.openligadb.de/index.html) | Public Bundesliga fixtures, results, table and goal scorers; no key or quota. | Coverage is not a substitute for six competitions or full team/player passing, shooting and possession data. | Possible independent Bundesliga cross-check; not a six-league primary feed. |
| [StatsBomb Open Data](https://github.com/statsbomb/open-data) | Selected historical competitions and event data. | It is a selective research dataset, not a guaranteed twice-daily feed for all six current competitions. Attribution terms apply. | Do not use for current-season coverage claims. |

## Publication rules

- Show only the fields the source actually returns. A missing stat is unavailable, never zero.
- Compute rates only from verified numerator and denominator covering the same competition, season and matches.
- The player page accepts only snapshots explicitly marked `independently-verified`; the GOAL API sync labels its output `provider-only`. Older snapshots without a verification label are also withheld.
- The twice-daily workflow no longer calls GOAL API automatically. Its player fetch is an explicit manual audit option so the free allowance is not spent on unpublished data.
- Keep results and standings independently available while the player source is unresolved.

## What would unlock the requested full tables

A candidate source must grant permission to display its data, cover all six competitions in 2026/27, return complete team and player populations, and document the needed season totals (shots, shots on target, passing, dribbles, cards and so on). Before publishing, reconcile a sample of scores, team totals and player totals with league or club records, and preserve source and update time per metric. PitchAPI has passed the six-competition sample check, but its full-season completeness and reuse terms remain unverified.
