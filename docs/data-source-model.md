# Data source model

KappaTracker uses two classes of source. They are complementary, not competing single truths.

## Source roles

- Official Tarkov Wiki / Fandom: primary semantic source for rules, requirements, exceptions, Kappa/Collector behavior, profile semantics and patch interpretation.
- `json.tarkov.dev`: structured source for IDs, task rows, traders, objectives, objective maps, items, barters, hideout and serializable relationships.
- `api.tarkov.dev/graphql`: legacy/maintenance; do not use for generated `src/data/*`.

## Provenance rule

Only record a source in task-level provenance when the pipeline actually read that source for that task/field.

Current task sync reads only `json.tarkov.dev`, so each generated task has structured JSON provenance only. The wiki remains documented in metadata as `primarySemanticSource`, but it is not attributed as task provenance until a wiki adapter verifies or overrides a field.

## Conflict representation

Future semantic enrichment should preserve both values when structured and semantic sources disagree:

```text
field: collector.requiredTasks
structuredValue: value from json.tarkov.dev
semanticValue: value from Fandom/Wiki
sources: provenance records for both reads
conflict: true
```

In code this is represented by `SourceConflict` / `sourceConflicts` on `Task`. #57 can use that shape for Collector/Kappa without replacing the structured task catalog or hiding disagreements.
