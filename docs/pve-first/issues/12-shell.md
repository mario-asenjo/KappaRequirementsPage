---
title: Fase 4 - Shell y Mission Control PvE-first
labels: priority/p1,type/feature,type/ux,area/frontend,area/mission-control
---
## Objetivo
Que la primera pantalla responda "que hago ahora en mi perfil PvE".

## Alcance minimo
- Header: selector de perfil (modo, faccion, prestige) antes que el selector de objetivo.
- Banner de datos: modo, version de juego y `syncedAt`; aviso si el dataset tiene mas de 14 dias.
- Home: progreso del objetivo, LL por trader, estado Collector resumido, iniciadas por logs (#25), siguiente accion, ultima importacion del perfil.
- Eliminar textos que asumen Kappa = 257 tasks.

## Criterios de aceptacion
- [ ] Usuario nuevo arranca en PvE sin configurar nada.
- [ ] Responsive y AA.
- [ ] `npm run build` pasa.
