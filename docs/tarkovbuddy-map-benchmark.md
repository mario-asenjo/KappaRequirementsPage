# TarkovBuddy map benchmark

Reference route inspected: `https://www.tarkovbuddy.org/maps`.

## Source inspection

- The live app is a Next.js site whose public page bundle contains `mapImages`, `staticMarkers`, and `questMarkers` data for the map route.
- The About page describes the feature as local map images, overlays, quest markers, extracts, spawns, story markers, coordinate capture, wheel zoom and fit-to-screen reset behavior.
- No GitHub repository/license link was visible on the site or discoverable via GitHub repository search for `TarkovBuddy`/`Knivet` at the time of inspection, so KappaTracker should attribute the reference and avoid claiming license certainty beyond the user's stated open-source assumption.

## UX contract to match

- App-shell layout: dark left navigation, top title strip, content cards.
- Hero card with compact stat cards: selected map, visible markers, quest marker count, active layers, player level.
- Horizontal map tabs: Customs, Factory, Ground Zero, Interchange, Lighthouse, Reserve, Shoreline, Streets of Tarkov, The Lab, Woods.
- Control panel below tabs:
  - search field labelled `SEARCH QUESTS`
  - player-level controls with optimizer button, +/- controls, completion percentage, reset/undo
  - toggle chips: Quest markers, Active only, Show completed, Kappa only, PMC extracts, Scav extracts, Co-op extracts, PMC spawns, Historia, Bosses, Cultists, Transits
- Main workspace: large image-backed map on the left and visible marker list on the right.
- Marker buttons are circular overlays with short labels: `EX` for extracts, `ST` for transits, numbered quest/story markers, and colored dots/chips by layer.
- Marker list mirrors map marker numbers and includes marker title, description/requirements, status badges and percentage coordinates.
- Clicking the map can lock/copy percent coordinates.

## Data contract shape observed in the public bundle

```ts
interface TarkovBuddyMapBundle {
  mapImages: Record<MapName, string>;
  staticMarkers: Record<MapName, TarkovBuddyStaticMarker[]>;
  questMarkers: Record<MapName, TarkovBuddyQuestMarker[]>;
}

interface TarkovBuddyStaticMarker {
  type: 'extract' | 'spawn' | 'boss' | 'cultist' | 'transit' | string;
  subtype?: 'pmc' | 'scav' | 'coop' | string;
  x: number; // percent on image
  y: number; // percent on image
  title: string;
  desc: string;
}
```

## Ground Zero observed data

- `mapImages['Ground Zero']` points to `/maps/gz.webp` in the reference app.
- `staticMarkers['Ground Zero']` has 38 markers:
  - 20 PMC spawns
  - 8 cultist spawns
  - 5 PMC extracts
  - 3 Scav extracts
  - 1 Co-op extract
  - 1 transit
- `questMarkers['Ground Zero']` is empty in the inspected bundle.

## KappaTracker adaptation decision

For this PR, keep KappaTracker's validated marker schema for long-term data hygiene, but add a `tarkovBuddy` compatibility block and render the map using the same percent x/y image-space contract. The UI should lead with the image-backed map, horizontal tabs, filter chips, coordinate capture, and a right marker list; source/attribution notes stay secondary.
