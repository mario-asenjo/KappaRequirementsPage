---
title: Fase 3 - Distribucion del extractor (ZIP/mjs) con catalogos por modo y rutas post Unity 6
labels: priority/p2,type/feature,area/import-logs,area/devops-ci
---
## Objetivo
Regenerar el paquete descargable con el parser 2.0 y catalogos de ambos modos.

## Alcance minimo
- `buildExtractorDownload.ts` embebe `catalog-index.json` (IDs por modo + tombstones) en vez de solo `tasks.json`.
- Autodeteccion de rutas revisada (Steam y launcher BSG, rutas post Unity 6 si cambian).
- README del ZIP actualizado (PvE, perfiles, privacidad).
- Version del extractor y fecha del catalogo en la salida JSON.

## Criterios de aceptacion
- [ ] `test:extractor-download` pasa.
- [ ] El JSON generado indica version de extractor y catalogo.
