---
title: Fase 1 - Achievements, prestige y quest items por modo desde json.tarkov.dev
labels: priority/p1,type/feature,area/data
---
## Objetivo
Sustituir `fetchAchievements.ts` (GraphQL) y anadir prestige y quest items como datasets por modo.

## Contexto verificado
- El payload `/pve/tasks` incluye `achievements` (131, con `side`, `normalizedRarity`, `playersCompletedPercent`), `prestige` (6 niveles PvE) y `questItems` (138).
- Local: 109 achievements de junio; prestige no modelado.
- Prestige PvE: P1 nivel 15 + 5M; P2 25; P3 35; P4 40; P5/P6 47 + taskStatus + estaciones + 20M.

## Alcance minimo
- `src/data/<mode>/achievements.json` conservando el enriquecimiento wiki existente cuando el ID coincide.
- `src/data/<mode>/prestige.json`: condiciones tipadas (`playerLevel`, `haveItem`, `skill`, `hideoutStation`, `taskStatus`) con nombres resueltos y recompensas.
- `src/data/<mode>/questItems.json`.
- Achievements seasonal marcados para no mostrarse en PvE.

## Criterios de aceptacion
- [ ] Ningun script de achievements usa GraphQL.
- [ ] Prestige PvE muestra 6 niveles con condiciones legibles.
- [ ] Tests de normalizacion con fixtures pequenos.
