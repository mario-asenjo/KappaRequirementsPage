# MapGenie interactive map benchmark

Reference routes inspected:

- `https://mapgenie.io/tarkov/maps/customs`
- `https://mapgenie.io/tarkov/maps/interchange`

## What makes MapGenie feel interactive

MapGenie is not just a static map with pins. The core UX contract is:

1. **Free camera**
   - Mapbox-based pan by drag.
   - Mouse wheel / +/- zoom.
   - Reset/fullscreen/utility controls in a floating toolbar.
   - Keyboard support is expected for accessibility in our implementation.

2. **Layer-first sidebar**
   - Left panel owns map switching, search, show/hide all, and category counts.
   - Categories are grouped by jobs-to-be-done: Loot, Enemies, Locations.
   - Each category has a visible count and can be toggled independently.

3. **Marker density handling**
   - Markers stay compact and readable at high density.
   - Important markers show a small icon/pin plus a tiny location label below/near the icon.
   - Some noisy categories can hide labels to avoid overwhelming the map.

4. **Click for context**
   - Selecting a marker opens contextual information: title, category, description, location details, and media when available.
   - Example observed for Customs: `ZB-1011 [PMC]` has extraction metadata and an associated image in MapGenie.

5. **Search and focus**
   - Search narrows map markers and sidebar categories.
   - Selecting a result or nearby marker should move/focus the camera.

## Data observed in MapGenie public client state

The page exposes a public client-side `mapData` object with maps, groups, categories, regions, locations, routes and notes. For Customs, the inspected client state contained:

- 888 locations.
- Groups: Loot, Enemies, Locations.
- Categories including Ammo Box, Armor, Cache, Scav, Boss, Extraction, Location, Locked Door, Quest Item, Spawn Point, Transit and Transition.
- Location records with fields like `id`, `map_id`, `category_id`, `title`, `description`, `latitude`, `longitude`, `media`, `tags`, and `category`.

This is useful for understanding the UX/data shape, but KappaTracker should not depend on MapGenie runtime data or copy its media/assets without clear licensing. Use MapGenie as UX benchmark and keep TarkovBuddy/tarkov.dev/Wiki as the current source chain.

## KappaTracker implementation direction

Current decision:

- **MapGenie = interaction benchmark**: pan, zoom, sidebar layer groups, tiny marker labels, marker detail card.
- **TarkovBuddy = data bootstrap**: image and percent x/y marker contract for maps we can cover broadly.
- **Future media contract**: add optional per-marker `media` entries for local/verified screenshots, captions and source/license metadata before showing real photos.

The first MapGenie-like increment should ship without a heavy Mapbox dependency by using CSS transforms over the existing local map image:

- draggable viewport;
- wheel and button zoom;
- keyboard panning/zoom reset;
- labels below markers;
- selected marker details panel;
- nearby marker shortcuts;
- source strip documenting that MapGenie is an interaction reference only.

A later increment can add clustering and/or tile-based rendering if the image-transform approach becomes insufficient for maps with hundreds of markers.
