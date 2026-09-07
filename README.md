# Throwball

A Render-ready proof of concept for a darts and Premier League football game.

Enter three darts for each side, reveal a deterministic football result, and build your opening-round table for matchweek one of the 2026/27 Premier League.

## Deploy on Render

1. In Render, choose **New -> Static Site**.
2. Connect this GitHub repository: https://github.com/JRowding/Throwball
3. Use build command: `npm install && npm run build`
4. Use publish directory: `dist/client`
5. Deploy.

No environment variables, backend, API keys or database are required.

## Playing

- Select a fixture, enter three darts in throw order for each team, and choose **Reveal & record**.
- Each team has a round slot target based on fixture order. Arsenal are slot 1, Coventry City are slot 2, and Chelsea are slot 20 in this opening round.
- A single, double or treble on that team's slot number adds a scoring boost for that visit.
- Legal outcomes are `1`-`20`, `D1`-`D20`, `T1`-`T20`, `25`, `BULL`, and `MISS`.
- Results, drafts and model settings are saved in the browser.

## Engine

Every ordered three-dart visit maps to one deterministic ID and percentile across all 63^3 legal combinations. Team rating, opponent rating, home advantage and slot boosts then map that percentile to goals.

The model is intentionally easy to tune in `lib/game.ts` and in the app's settings panel.