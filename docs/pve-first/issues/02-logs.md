---
title: Fase 0 - Certificar senales de logs reales 1.0 a 1.3.x (incluido Unity 6)
labels: priority/p1,type/research,area/import-logs,area/data
---
## Objetivo
Construir la matriz de senales de logs con evidencia real antes de reescribir el extractor: que fichero da que dato, en que versiones, y con que fiabilidad para PvE.

## Contexto verificado
- Discovery 2026-09-28: carpetas `log_YYYY.MM.DD_HH-MM-SS_<version>` de 1.0.4.6 a 1.1.5.1; senales `gw-pvp`, `gw-pvp-season`, `onlinePveRaidStates`, `TRACE-NetworkGameCreate ... GameMode`; eventos de quest en `push-notifications_*.log` y `output_*.log`.
- 7 IDs de logs siguen sin existir en `/pve/tasks` ni `/regular/tasks` (lista en `docs/pve-first-plan.md` 2.5).
- 1.3.5.0 migra a Unity 6: posibles cambios de formato/ruta.

## Alcance minimo
- Script read-only `scripts/surveyLogs.ts` que recorre `Logs/` y emite un informe **redactado** (sin profile/account IDs): sesiones por version, modo inferido por sesion y senal usada, conteo de eventos por fichero/sufijo, IDs desconocidos, duplicados push/output.
- Ejecutarlo contra los logs reales (1.0 -> 1.3.x y al menos una sesion post Unity 6).
- Documentar `docs/logs-signal-matrix.md`: senal, fichero, versiones, fiabilidad, falso positivo conocido.
- Clasificar los 7 IDs (evento, seasonal, Arena, battle pass o desconocido).
- Crear fixtures sinteticos minimos por version/modo para los tests del extractor.

## Criterios de aceptacion
- [ ] Cada sesion de los logs reales tiene un modo asignado o `unknown` con motivo.
- [ ] Se sabe si `push-notifications` y `output` duplican eventos y como deduplicar.
- [ ] Hay evidencia de formato post Unity 6 o queda anotado como bloqueador.
- [ ] Fixtures sin datos personales en `scripts/fixtures/logs/`.
