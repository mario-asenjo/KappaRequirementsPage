---
title: Epic PvE-first: cohesionar datos, extractor y vistas con Tarkov 1.3 (PvE Zone)
labels: priority/p1,type/feature,type/research,area/data,area/import-logs,area/frontend
---
## Objetivo
Reorientar KappaTracker a **PvE Zone como modo principal** (PvP Zone y PvP Season como perfiles secundarios) y dejar datos, extractor de logs y todas las vistas coherentes con la version actual del juego (1.3.x, noviembre 2026).

Plan completo: `docs/pve-first-plan.md`.

## Contexto verificado (2026-11-17)
- `main` usa `src/data/tasks.json` del 2026-06-07 (GraphQL, modo regular): 499 tasks, 257 "Kappa", 102 "Lightkeeper".
- Contra `json.tarkov.dev/pve/tasks` hoy: 46 tasks de main no son PvE (23 `[PVP ZONE]`, 4 `New Beginning` solo PvP, 19 eliminadas del juego) y faltan 46 (23 `[PVE ZONE]` + 23 nuevas).
- El trabajo 1.1 (#59, #60) se mergeo en una rama apilada y #61 se cerro sin merge: nunca llego a main. Su snapshot (512 tasks, 2026-09-28) ya esta desfasada (-18 / +5).
- PvE actual: `kappaRequired` = 13 tasks; Collector exige nivel 42, LL4 con 7 traders, Fence LL3, 5 tasks previas y 44 items FiR. `lightkeeperRequired` = 0.
- Nuevos datos estructurados: `traderRequirements`, `otherRequirements` (pools LL / dialogo), `factionName`, `neededKeys`, `failConditions`, `restartable`, `availableDelaySeconds`, unlocks, `prestige` (6 niveles PvE), 131 achievements, 138 quest items.
- Juego: 1.2.0.0 Prestige PvE; 1.3.0.0 Halloween + bots PvE alta dificultad; 1.3.5.0 Unity 6 a mediados de noviembre (riesgo para logs).

## Criterios de aceptacion
- [ ] Ningun dataset generado depende de `api.tarkov.dev/graphql`.
- [ ] Perfil PvE activo: cero tasks `[PVP ZONE]`, eliminadas o de otra faccion visibles.
- [ ] Kappa refleja las puertas reales de Collector; Lightkeeper y Prestige con datos actuales.
- [ ] Importar logs mixtos PvP/PvE no mezcla progreso entre perfiles.
- [ ] La UI muestra version de juego y fecha de sync de cada dataset.
- [ ] CI valida invariantes de datos, fixtures del extractor y build.
