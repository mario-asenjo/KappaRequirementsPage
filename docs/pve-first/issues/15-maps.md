---
title: Fase 4 - Mapas y raid planner sobre objetivos PvE
labels: priority/p2,type/feature,area/maps,area/raid-planner,area/frontend
---
## Objetivo
Re-basar mapas (#41) y planner (#28) en `objectives[].maps/zones` del dataset del perfil.

## Alcance minimo
- Catalogo de mapas desde `/pve/maps` (anadir Infected Factory, Infected Lab, The Lab (Dark) marcados como evento).
- Planner por mapa: objetivos activos, items y llaves (`neededKeys`), entregas post-raid.
- Recoger cambios de 1.2.0.0 en Customs/Interchange (extracciones nuevas, ZB-1013 key, Guard Post key) cuando haya markers.

## Criterios de aceptacion
- [ ] Seleccionar un mapa lista todas las tasks activas con objetivos en el.
- [ ] Mapas de evento no aparecen fuera de evento salvo filtro.
