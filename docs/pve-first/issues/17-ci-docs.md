---
title: Fase 5 - Invariantes de datos en CI, sync automatico por modo y documentacion
labels: priority/p1,type/feature,type/docs,area/devops-ci,area/docs,area/data
---
## Objetivo
Que los datos no vuelvan a quedarse atras sin que nadie se entere.

## Alcance minimo
- `npm run test:data-invariants`: sin `[PVP ZONE]` en PvE, prerequisitos resolubles, goals con IDs existentes, conteos > 0, `syncedAt` presente.
- Workflow programado (re-scope de #33) que sincroniza ambos modos y abre PR con resumen: tasks anadidas/eliminadas/renombradas por modo.
- README, FAQ (#35) y `MEMORY.md` actualizados al flujo PvE-first.

## Criterios de aceptacion
- [ ] CI falla si se rompe un invariante.
- [ ] El PR automatico explica el diff en lenguaje claro.
