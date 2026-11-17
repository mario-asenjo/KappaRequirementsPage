---
title: Fase 3 - Extractor 2.0: atribucion de modo y perfil por sesion de logs
labels: priority/p1,type/feature,area/import-logs,area/data
supersedes: 55,36
---
## Objetivo
Reescribir el parser para que cada evento de quest pertenezca a la sesion (y por tanto al modo/perfil) en la que ocurrio.

## Contexto verificado
- Parser de main: solo `push-notifications`, sin modo ni version.
- PR #63: `modes[0]` global para todas las sesiones, `output` sin deduplicar, regex de version generica.
- La matriz de senales sale de la issue de certificacion de logs.

## Alcance minimo
- Agrupar ficheros por carpeta `log_*`; `clientVersion` desde el nombre de carpeta.
- Modo por sesion con senales ponderadas (matriz certificada); `unknown` si hay conflicto.
- Deduplicar eventos push/output; ordenar por timestamp; estado final = ultimo evento (soporta `restartable` y fallos).
- `schemaVersion: 2` con `profiles[]`: `{ mode, profileIdHash, versionRange, sessionCount, completed, started, failed, unknown[] }`.
- `unknown` clasificado contra `catalog-index.json`: `other-mode`, `removed`, `unresolved`.
- Opcion `--since <version|fecha>` para ignorar sesiones anteriores a un prestige.
- Mantener salida v1 con `--schema 1`.

## Criterios de aceptacion
- [ ] Fixture mixto PvP 1.0 + PvE 1.3 produce dos perfiles sin cruces.
- [ ] Fixture con fallo y reinicio termina en el estado correcto.
- [ ] Fixture post Unity 6 pasa.
- [ ] No se imprimen account IDs.
- [ ] `test:extractor` y `test:import` pasan.
