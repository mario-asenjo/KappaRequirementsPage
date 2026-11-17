---
title: Fase 4 - Quests (lista, detalle, arbol y LL board) con datos 1.3
labels: priority/p2,type/feature,type/ux,area/frontend,area/quest-tree
---
## Objetivo
Explotar los nuevos campos en todas las vistas de quests del perfil activo.

## Alcance minimo
- Lista: filtros por trader, LL, mapa por objetivo, faccion, estado, "entregable ahora"; badges de exclusiva PvE, fallo posible, reiniciable, delay.
- Detalle: objetivos tipados con mapas/items/FiR, llaves necesarias, condiciones de fallo, unlocks de recompensa, procedencia.
- Arbol: solo cadenas reales de prerequisitos (#27).
- LL board por trader/LL con pools (#58).

## Criterios de aceptacion
- [ ] Ninguna vista usa `location` como unica fuente de mapa.
- [ ] Disponibilidad coherente con la regla de #71.
