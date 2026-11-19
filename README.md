# Leonida Legend — GTA VI Trophy Guide & Tracker

[![Make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Rank](https://make.fun/badge/gta6-trophy-guide-01/rismzz/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Reward](https://make.fun/badge/gta6-trophy-guide-01/rismzz/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI — built for the [gta6-trophy-guide-01 bounty on make.fun](https://make.fun/bounty/gta6-trophy-guide-01).

## What it is

- **Checklist of all 55 trophies** with their official names, descriptions and grades exactly as PlayStation publishes them, plus a guide in our own words for each one that cites its sources (Exophase for the official list, PSNProfiles for the PSN tracked counts).
- **Tracker**: tick trophies off, set per-trophy counters (250 stunts, 42 Shooting Range golds, 100 WAiNK spots…), progress saved in the browser, exportable to a file and importable back.
- **Filters** by kind (story, missable, collectibles, activities, side strands, open world — honestly, this list has no online trophies, so that filter shows 0), by grade, and by search.
- **Spoiler setting** that hides the names and descriptions of story trophies until they are earned.
- **Roadmap to the platinum** in six stages, built from the official descriptions, and **20 missable trophies flagged** — story missions and strand finales that may close once you pass them.
- **Honest guides**: where a place or step is not confirmed by the official description, the guide says so instead of inventing one.

## Run it

Static files, no build step, no network:

```sh
node serve.ts
# open http://localhost:8080
```

Or open `app/index.html` directly in a browser.

## Entry

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Note

Unofficial fan guide, not affiliated with Rockstar Games. No Rockstar logo, artwork or game imagery is used.

---

Built for [make.fun](https://make.fun/?ref=aa4mcy45)
