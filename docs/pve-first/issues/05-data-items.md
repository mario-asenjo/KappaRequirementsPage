---
title: Fase 1 - Items, hideout y barters PvE (integrar PR #62)
labels: priority/p2,type/feature,area/data,area/hideout,area/economy
---
## Objetivo
Dejar el planner de items y el hideout sobre datos PvE actuales, incluyendo items FiR de Collector y requisitos de Prestige.

## Contexto verificado
- `fetchItemRequirements.ts` en main usa GraphQL (junio). PR #62 ya migra a `json.tarkov.dev/pve`.
- Collector pide 44 items FiR; Prestige pide estaciones de hideout y millones de rublos.

## Alcance minimo
- Rebase y merge de PR #62 sobre el pipeline de tasks multi-modo.
- Requisitos de items derivados del nuevo catalogo de tasks (objetivos `giveItem`/`findItem` con `foundInRaid`).
- Hideout PvE: estaciones, niveles y requisitos (base para #39).
- Requisitos de Prestige incluidos como fuente de demanda de items.

## Criterios de aceptacion
- [ ] Sin dependencias GraphQL.
- [ ] Cada requisito indica task/estacion/prestige origen y si es FiR.
- [ ] `test:item-requirements` pasa con datos PvE.
