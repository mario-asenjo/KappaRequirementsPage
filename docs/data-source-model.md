# Data source model

KappaTracker uses complementary sources rather than one universal source of truth.

- Official Tarkov Wiki / Fandom provides editorial and game-rule semantics. The item-requirements pipeline reads it only to enrich Quest and Hideout requirement rows missing from structured data.
- `json.tarkov.dev` is the structured source for stable IDs, items, traders, tasks, hideout and trader barters. `src/data/itemRequirements.json` records every JSON endpoint it actually read in `metadata.sources`.
- `api.tarkov.dev/graphql` is legacy/maintenance and must not generate `src/data/*`.

## Trader Barters

`/items` uses `json.tarkov.dev/pve/barters` plus the item and trader dictionaries. A barter retains the barter ID, trader ID, trader name, optional `loyaltyLevel`, cost items and received items. Each relevant item receives an `input` or `output` view of the same barter; neither view contributes to quest/hideout keep totals.

Fandom is not listed as barter provenance because the barter pipeline does not read Fandom Trading sections.
