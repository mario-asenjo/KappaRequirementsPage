---
title: Fase 0 - Saneamiento de backlog, ramas y PRs para PvE-first
labels: priority/p1,type/research,area/devops-ci,area/docs
---
## Objetivo
Dejar el repositorio en un punto de partida limpio: trabajo 1.1 rescatado, PRs abiertas decididas, issues obsoletas cerradas o re-enfocadas y ramas muertas borradas.

## Contexto verificado
- #59 y #60 se mergearon en `feat/item-barter-trades-panel`, no en `main`; #61 cerrado sin merge.
- PR #62 (barters) ya usa `json.tarkov.dev/pve`: reutilizable.
- PR #63: modelo `ProfileProgress` reutilizable; parser asigna un unico modo global a todas las sesiones.
- ~35 ramas remotas ya mergeadas en `main`.

## Alcance minimo
- Mergear `docs/pve-first-plan` (plan + docs de discovery rescatados).
- Aplicar el triaje de la seccion 5 de `docs/pve-first-plan.md` (cerrar #36/#54/#55/#56/#57 como duplicadas, comentar enlaces en las que se mantienen).
- Decidir PR #62 (rebase en Fase 1) y PR #63 (cerrar tras portar el modelo a la issue de progreso por perfil).
- Borrar ramas remotas mergeadas.
- Actualizar `MEMORY.md` con el nuevo estado.

## Criterios de aceptacion
- [ ] `docs/tarkov-2026-discovery.md`, `docs/data-source-model.md` y `docs/pve-first-plan.md` en `main`.
- [ ] Ninguna issue abierta contradice el plan PvE-first.
- [ ] Solo quedan ramas con trabajo vivo.
