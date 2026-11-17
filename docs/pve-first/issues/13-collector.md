---
title: Fase 4 - Collector/Kappa 1.3 como goal compuesto y Lightkeeper actual
labels: priority/p1,type/feature,type/ux,area/frontend,area/data,area/mission-control
supersedes: 57
---
## Objetivo
Modelar Kappa con sus puertas reales y rehacer el goal Lightkeeper, ahora vacio.

## Contexto verificado (PvE, 2026-11-17)
- Collector: nivel 42; LL4 Prapor, Therapist, Skier, Peacekeeper, Mechanic, Ragman, Jaeger; Fence LL3; tasks Chemical - Part 3, Sew it Good - Part 2, Shooter Born in Heaven, The Tarkov Shooter - Part 4, Postman Pat - Part 2; 44 items FiR.
- Cadena `kappaRequired` = 13 tasks.
- `lightkeeperRequired` = 0; Lightkeeper tiene 14 tasks, 9 con delay de 10 h.

## Alcance minimo
- `Goal` compuesto: `gates[]` de tipo `level | traderLevel | task | itemHandover | fence` con estado por perfil.
- Pagina Collector: checklist de gates + checklist de 44 items (FiR, entregado, donde encontrarlo).
- Goal "Kappa legacy (257)" solo como vista historica opcional.
- Lightkeeper: acceso segun 1.1.5 (capa wiki) + sus 14 tasks con temporizadores de disponibilidad.
- Bloqueadores (#26) calculados sobre los gates.

## Criterios de aceptacion
- [ ] El % de Kappa sale de los gates, no de `countsForKappa`.
- [ ] Cada gate explica que falta.
- [ ] Datos con procedencia y conflictos visibles.
