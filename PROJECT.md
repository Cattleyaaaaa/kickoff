# Kickoff website prototype

## Product direction

Kickoff is an independent football news and fan community site, planned for kickoff.nextfield.top and designed to merge into NextField later.

## Confirmed scope

- Desktop-first, responsive on phones.
- Main competitions: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, UEFA Champions League.
- First release is free, has no ads, and does not require sign-in.
- The first release displays post-match results; no live score feed. Results, events, standings, and player data are scheduled for daily synchronization.
- Home page: latest news as the lead column, team updates and trending discussions in the right rail, and a seven-day results section below. Team updates sort newest first. Results default to all competitions; fans can switch to their followed teams and filter by date.
- News: headline, short summary, publisher, publication time, source links; merge duplicate stories and list their sources. Automatically publish daily. Admins can add or block sources.
- Languages: simplified Chinese, traditional Chinese, English. Detect the first language from the browser. Translate summaries and analysis into the chosen language.
- Themes: light by default, with dark and system options. Remember the selection.
- Guests can select teams; preferences stay on this device. The onboarding prompt can be skipped. If no teams are selected, show popular team updates. On later account launch, migrate local follows to the account.
- Match pages: full-time result, events, lineups, match statistics, pre-match analysis, and data analysis.
- Standings show the current season only. Player profiles include position, appearances, team, nationality, goals, and assists; stats default to the current season with a career-total option.
- Generate AI previews and data reads for derbies, knock-out matches, title/relegation-deciding matches, and followed-team matches. Admins can edit, approve, or return drafts; they can manually flag key matches.
- Comments with likes, replies, hot sorting, and reporting are planned for after accounts launch. Reports go to admin review before hiding a comment.
- Email and Google sign-in are planned for a later release. Browser push reminders cover kick-off, goals, cards, and full-time for followed teams.
- Admin panel: manage news sources, check news/result sync, see failures, and review AI analysis drafts.

## Prototype status

The current screen uses sample fixtures, news, and discussion data. It does not call a live football API or DeepSeek yet. API credentials, scheduled jobs, persistent storage, moderation and review tools, and real push delivery remain to be connected on a server.
