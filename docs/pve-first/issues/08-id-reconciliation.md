---
title: Fase 2 - Reconciliacion de IDs y migracion del progreso existente
labels: priority/p1,type/feature,area/data,area/import-logs
---
## Objetivo
Que el progreso guardado con el catalogo de junio (y los imports antiguos) se traduzca correctamente al catalogo PvE actual.

## Contexto verificado
- 23 pares `[PVP ZONE]` / `[PVE ZONE]` con IDs distintos y mismo nombre base.
- 19 tasks eliminadas del juego y 4 `New Beginning` solo PvP siguen en main.

## Alcance minimo
- Tabla generada `src/data/id-reconciliation.json`: `{ fromId, toId?, reason: 'pvp-zone-pair' | 'removed' | 'pvp-only' | 'renamed' }`.
- Al migrar un perfil PvE: mapear pares PvP->PvE solo con confirmacion del usuario; mover IDs eliminados a `legacyCompletedTaskIds` (visibles en un panel "historico").
- Mismo filtro en la importacion v1.

## Criterios de aceptacion
- [ ] Ningun ID huerfano cuenta para progreso.
- [ ] El usuario ve que se migro, que se archivo y por que.
