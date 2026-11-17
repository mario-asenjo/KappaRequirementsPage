---
title: Fase 1 - Capa semantica wiki: Collector, pools de Loyalty Level y reglas PvE
labels: priority/p2,type/research,area/data
---
## Objetivo
Completar lo que `json.tarkov.dev` no expone y registrar conflictos entre fuente estructurada y wiki.

## Contexto verificado
- 168 tasks dependen de `globalVariable` (contadores de pool LL) pero la fuente no dice que tasks incrementan cada contador.
- Collector: los datos estructurados incluyen Postman Pat - Part 2 y reputacion Fence (karma Scav) >= 3; #57 (wiki de septiembre) no.
- `docs/data-source-model.md` define `SourceConflict`.

## Alcance minimo
- Adaptador MediaWiki (Fandom) para paginas Collector, Loyalty, Prestige y tasks de pools.
- Mapa `variableId -> { trader, loyaltyLevel, label, feedingTaskIds? }` con `dataConfidence`.
- Conflictos guardados en `sourceConflicts`, visibles en UI como aviso.

## Criterios de aceptacion
- [ ] Cada `variableId` tiene trader/LL asignado o `unknown` explicito.
- [ ] Collector tiene sus puertas confirmadas por dos fuentes o conflicto registrado.
