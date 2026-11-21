---
title: Fase 4 - Paginas de Prestige y achievements PvE
labels: priority/p2,type/feature,type/ux,area/frontend
---
## Objetivo
Dar visibilidad a Prestige PvE (6 niveles) y actualizar achievements a 131 con filtrado por modo.

## Alcance minimo
- `/prestige`: condiciones por nivel con progreso del perfil (nivel, skills manuales, estaciones, rublos, tasks) y recompensas.
- `/achievements`: dataset por modo, ocultar seasonal en PvE, rareza actual.

## Criterios de aceptacion
- [ ] Prestige muestra que falta para el siguiente nivel.
- [ ] `test:achievements` pasa con el nuevo dataset.
