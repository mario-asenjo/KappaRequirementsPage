---
title: Fase 2 - Progreso por perfil/modo con faccion, Loyalty Level y Prestige (PvE por defecto)
labels: priority/p1,type/feature,type/ux,area/frontend,area/import-logs
supersedes: 54
---
## Objetivo
Persistir progreso por perfil (`mode + profileId`) con PvE como perfil por defecto, y modelar los datos de perfil que ahora deciden la disponibilidad de tasks.

## Contexto verificado
- `UserProgress` v1 es global. PR #63 propone v2 con `profiles`.
- 34 tasks son exclusivas de faccion; 105 tienen gate de LL; Collector depende de LL4 x7 y Fence LL3; Prestige PvE resetea el perfil.

## Alcance minimo
- `UserProgress v3` (esquema en `docs/pve-first-plan.md` 3.2) portando el modelo de #63.
- Campos nuevos: `faction`, `prestigeLevel`, `traderLoyalty`, `fenceLevel`, `failedTaskIds`, `collectorItemsHandedOver`, `prestigeHistory`.
- Migracion v1/v2 -> v3 a `pve:default` sin perder IDs.
- La app carga el dataset del modo del perfil activo (`src/data/<mode>/*`).
- Selector de perfil en Header; crear/renombrar/borrar perfiles; "Hacer prestige" archiva y resetea.
- Disponibilidad de task = nivel + prerequisitos + LL + faccion + modo (+ pools cuando haya datos).

## Criterios de aceptacion
- [ ] Cambiar de perfil no muestra progreso de otro.
- [ ] Un perfil BEAR no ve tasks USEC.
- [ ] Prestige archiva el progreso anterior y es reversible desde el historial.
- [ ] `test:progress` cubre migraciones v1, v2 y prestige.
