---
title: Fase 1 - Pipeline de tasks multi-modo (PvE primario) desde json.tarkov.dev
labels: priority/p1,type/feature,area/data,area/devops-ci
supersedes: 56
---
## Objetivo
Generar un catalogo de tasks por modo (`src/data/pve/tasks.json`, `src/data/pvp/tasks.json`) con el esquema completo de la fuente y sin depender del GraphQL legacy.

## Contexto verificado
- `/pve/tasks` hoy: 499 tasks; `/regular/tasks`: 503. `main`: snapshot GraphQL regular de junio.
- Campos disponibles: `traderRequirements` (105), `otherRequirements` (168 globalVariable, 12 dialogue), `factionName` (34), `neededKeys` (57), `failConditions` (36), `restartable` (16), `availableDelaySeconds*` (10), `startRewards`, `finishRewards.*Unlock`, `experience`, `objectives[].type/maps/zones/items/count/foundInRaid`.
- Base de codigo: `scripts/data-sources/tarkovDevJson.ts` y `scripts/data-normalizers/tasks.ts` de la rama `feat/json-api-task-pipeline`.

## Alcance minimo
- Rescatar data-source/normalizer de #60 y ampliar al esquema `Task` de `docs/pve-first-plan.md` 3.1 (`gameMode`, `modeExclusive`, `faction`, `unlock.*`, objetivos tipados, `neededKeys`, fallos, delays, unlocks, `dataConfidence`).
- `npm run update:tasks -- --mode pve|pvp|all`; por defecto `all`.
- `src/data/catalog-index.json`: IDs por modo + tombstones de tasks eliminadas (fecha de deteccion, ultimo nombre).
- Error accionable si la fuente falla; no sobrescribir datos con respuestas vacias o con caidas de conteo > 10% sin `--force`.
- Alias temporal `src/data/tasks.json` = PvE para no romper la app hasta la Fase 2.
- `buildQuestTree` y `buildGoals` aceptan `--mode`.

## Criterios de aceptacion
- [ ] `src/data/pve/tasks.json` no contiene ningun titulo `[PVP ZONE]` ni IDs de tombstones.
- [ ] Toda `prerequisite` resuelve a un ID del mismo modo.
- [ ] `metadata` incluye `gameMode`, `syncedAt`, endpoints y conteos.
- [ ] `fetchTasks.ts` no referencia `api.tarkov.dev/graphql`.
- [ ] `npm run test:data-pipeline`, `build:quests`, `build:goals` y `npm run build` pasan.
