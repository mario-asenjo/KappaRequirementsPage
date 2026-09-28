# Tarkov 1.1+ discovery: perfiles, side tasks y logs

Fecha: 2026-09-28
Rama: `discovery/tarkov-2026-rework`
Objetivo final: convertir KappaTracker en tracker moderno para Tarkov 1.1+, con perfiles separados, progreso por modo y datos de misiones/importador coherentes con el juego actual.

## Resumen ejecutivo

Tarkov ya no es un flujo unico de wipe global -> quest checklist fija -> Kappa. Desde 1.1.0 hay tres carriles de progreso que la web debe tratar como perfiles separados:

1. `PvP Zone` permanente.
2. `PvE Zone` permanente, separado y sin wipe global automatico.
3. `PvP Season` / Seasonal character, separado, con reset cada 4-6 meses y servidores dedicados.

La wiki confirma que las Seasonal Characters son independientes de PvP Zone y PvE Zone, que Battle Pass progresa entre modos, que algunas recompensas estacionales se vuelven disponibles en todos los modos, y que las side tasks se reordenaron por Trader Loyalty Level.

Conclusion Ponytail: no toca reescribir la app entera primero. El primer corte que aguanta es cambiar el modelo de datos y progreso para soportar `gameMode`, `profileId`, `traderLoyaltyLevel` y `objectiveMaps`; despues la UI se vuelve una vista por perfil/modo usando el mismo tracker.

## Fuentes consultadas

- Fandom Wiki: `Changelog`, `Game modes`, `Collector`, `Quests`, `Prestige` via MediaWiki API.
- Pagina principal Fandom: https://escapefromtarkov.fandom.com/wiki/Wiki
- Datos locales del repo: `src/data/tasks.json`, scripts `fetchTasks`, `buildGoals`, `buildQuestTree`, `tools/eft-log-importer`.
- Logs reales: `C:\Users\masen\Desktop\EFTINSTALLFOLDER\EscapeFromTarkov\Logs`.
- tarkov.dev GraphQL: actualmente responde `422 {"errors":["GraphQL server unavailable. Try again later."]}`; el script `npm run update:tasks` falla por esa causa.

## Cambios funcionales detectados en Tarkov

### 1. Perfiles/modos separados

Fandom `Changelog` 1.1.0:

- "Added a new Seasonal Character profile. Seasonal Characters exist on separate servers and are completely independent from PvP Zone and PvE Zone characters."
- El progreso seasonal se resetea cada 4-6 meses con updates mayores/temporadas.
- Hay pantalla dedicada para crear/cambiar Seasonal Character.
- Seasonal rewards pueden desbloquear ofertas de trader permanentes para PvP Zone, PvE Zone y PvP Season.
- Battle Pass progression se comparte entre PvP Season, PvP Zone y PvE Zone.
- Seasonal achievements solo se obtienen con Seasonal Character.

Fandom `Game modes`:

- Seasonal PvP: mismo fundamento que PvP, pero con personaje separado, servidores dedicados, ciclo temporal, modificadores y recompensas exclusivas.
- PvE: personaje separado con PMCs IA; local o server segun mapa/grupo/Scav.

Impacto para KappaTracker:

- `UserProgress` global ya no basta. Hay que persistir progreso por `profileKey` y modo.
- Importar logs debe asociar el JSON a `profileId` y, si se puede inferir, a `PvP Zone`, `PvE Zone` o `PvP Season`.
- La Home debe arrancar con selector de perfil/modo antes que selector de objetivo.
- No se debe mezclar Kappa de PvE con PvP permanente ni seasonal.

### 2. Side tasks por Trader Loyalty Level

Fandom `Changelog` 1.1.0:

- "Most side tasks are now tied to a specific Trader Loyalty Level (LL)."
- Se desbloquean en grupos de 2-4 tasks por trader.
- Para abrir el siguiente grupo: completar varias tasks del LL actual o llegar al siguiente LL.
- Algunas cadenas siguen desbloqueando fuera del LL porque dan trader offers raras/crafts.
- En tasks de eliminar Scavs solo cuentan regular Scavs, Sniper Scavs y Player Scavs; bosses, Raiders y Rogues ya no cuentan.
- Se eliminaron required trader sales volume de Loyalty Level requirements.
- Se rebalancearon level/rep requirements y rewards de side tasks.

Impacto:

- `Task` necesita `traderLoyaltyLevel?: number`, `unlockGroup?: string|number`, `unlockKind?: 'loyalty-pool'|'chain'|'event'|'unknown'`.
- El arbol actual por prerequisitos sigue sirviendo para cadenas, pero no modela pools por LL. La nueva UX debe ser tablero por trader+LL, no solo grafo.
- Filtros actuales por nivel/prerequisito dan falsos negativos/positivos porque faltan grupos de LL.

### 3. Collector/Kappa cambio de puerta

Fandom `Collector` actual:

- Requiere Scav karma +3.
- Requiere Loyalty Level 4 con Prapor, Therapist, Skier, Peacekeeper, Mechanic, Ragman y Jaeger.
- Requiere completar Chemical - Part 3, Sew it Good - Part 2, Shooter Born in Heaven y The Tarkov Shooter - Part 4.
- Recompensa Secure container Kappa y achievement `Dawn of a New Era`.
- `The Kappa Path` queda como achievement viejo/pre-1.1.0.

Impacto:

- `countsForKappa` como lista de 257 tareas ya no representa la puerta real de Kappa.
- Hay que cambiar goals: `Kappa current` debe ser goal compuesto: LL4 traders + Fence karma + nivel/quest gates + handover de streamer items.
- Las misiones antiguas deben seguir en el catalogo, pero muchas dejaran de ser requeridas para Kappa.

### 4. "Any location" ya no es suficiente como mapa

El repo actual guarda `location: t.map?.name`, una sola location por task. Eso pierde detalle cuando:

- `map` es `Any` o undefined, pero objetivos concretos tienen maps.
- Una task tiene objetivos repartidos por varios mapas.
- El texto del objetivo menciona mapas concretos aunque la location principal sea generica.

Impacto:

- Hay que consumir `objectives.maps` cuando tarkov.dev vuelva, y/o enriquecer desde Fandom.
- Nueva forma minima: `objectiveMaps: string[]` y `objectives: { description, maps }[]` en vez de solo `string[]`.
- Raid planner y mapas deben usar objective-level maps, no task-level map.

## Estado actual del repo

- `src/data/tasks.json`: 499 misiones, 257 marcadas Kappa, 102 Lightkeeper.
- Traders en datos locales: BTR Driver=15, Fence=15, Jaeger=61, Lightkeeper=14, Mechanic=91, Peacekeeper=47, Prapor=66, Ragman=57, Ref=21, Skier=64, Therapist=48.
- Tasks con location ausente/Any en el JSON actual: 241.
- La metadata es de `2026-06-07T10:10:26.199Z`, anterior al rework 1.1.x.

Scripts afectados:

- `scripts/fetchTasks.ts` falla porque `https://api.tarkov.dev/graphql` esta caido/indisponible ahora mismo.
- `fetchTasks` no pide fields para profile/mode/LL/objective maps.
- `buildGoals` deriva Kappa desde `countsForKappa`; queda obsoleto como goal principal.
- `buildQuestTree` agrupa por prerequisitos, no por Trader LL.
- `ProgressImportFile.schemaVersion` sigue en 1 y solo soporta un `profile.mode?: string` opcional sin semantica fuerte.

## Logs locales analizados

Ruta real usada:

`C:\Users\masen\Desktop\EFTINSTALLFOLDER\EscapeFromTarkov\Logs`

Hallazgos:

- Logs presentes; ultima carpeta: `log_2026.09.27_20-23-25_1.1.5.1.47510`.
- Versiones detectadas por carpeta: 1.0.4.6.44802=25, 1.0.4.9.45133=19, 1.0.5.0.45272=25, 1.0.5.0.45383=2, 1.0.5.0.45436=5, 1.0.5.0.45464=29, 1.0.5.0.45581=38, 1.0.6.0.45949=8, 1.0.6.5.46221=1, 1.1.0.0.46657=3, 1.1.0.1.46699=2, 1.1.0.1.46777=4, 1.1.0.1.46911=12, 1.1.5.0.47242=11, 1.1.5.0.47426=7, 1.1.5.1.47510=6.
- El extractor actual contra logs reales genera:
  - 117 completadas.
  - 83 iniciadas.
  - 5 fallidas/alternativas.
  - 24 template events no reconocidos, 17 quest IDs unicos no presentes en `tasks.json`.
  - 513 raw matches.
- `profileId` detectado por extractor: `65a19930d1947af35a0b5675`.
- Hay endpoints/log lines claros para modo:
  - `gw-pvp.escapefromtarkov.com`
  - `gw-pvp-season.escapefromtarkov.com`
  - apariciones masivas de `onlinePveRaidStates`
  - `TRACE-NetworkGameCreate ... Location: ... GameMode: ...`

IDs desconocidos encontrados en logs, probables misiones nuevas/post-sync:

- `6834145ebc1f443d7603c8a7`
- `6834158f2f0e2a7eb90b62c8`
- `68341846186efa3c5b07f989`
- `68341a0b2f0e2a7eb90b62d4`
- `697878057aa1273126030fb0`
- `69788d4e963f08d9140bce19`
- `69fa5e0f04087f435106b9c7`
- `6a1c766939a00fb24a0b8d25`
- `6a1c79503bec45f2d70000da`
- `6a39936fec86c6005a0656c1`
- `6a446573cd2959c3a609f2a9`
- `6a5424ae135497b9df0c68be`
- `6a5c1578f2689567c30eb0f3`
- `6a5ccda873f06065630d61b0`
- `6a5cd2178fd7c2b201032f3f`
- `6a7637fed31fb1191903fc07`
- `6a91840a740be0cff50e0310`

Impacto para importer:

- El parser actual ya lee `push-notifications_*.log`, pero no lee `output_*.log`; en estos logs tambien aparecen `templateId`.
- La inferencia de modo puede venir de URL de gateway en `backend_*.log` y/o estado del profile en `application_*.log`/`output_*.log`.
- Hay que guardar source files por profile/mode para no mezclar PvE/PvP/Season.

## Backlog propuesto, en orden

### Phase 0 - Discovery cerrado y datos desbloqueados

1. Documentar hallazgos y crear issues. Hecho en este branch.
2. Arreglar/rodear indisponibilidad de tarkov.dev GraphQL.
3. Comparar IDs desconocidos de logs contra Fandom/tarkov.dev cuando vuelva.
4. Decidir fuente primaria/fallback: tarkov.dev si disponible; Fandom MediaWiki para fields nuevos y emergencia.

### Phase 1 - Modelo por perfil/modo

- Añadir `GameMode = 'pvp' | 'pve' | 'seasonal-pvp'`.
- Cambiar `UserProgress` a progreso por perfil: `profiles: Record<profileKey, ProfileProgress>`.
- Migrar legacy `userProgress` a perfil default sin perder datos.
- Añadir selector de perfil/modo en Home/Header.
- Mostrar warnings cuando un import tiene profile/mode distinto al activo.

### Phase 2 - Importer 2.0

- `schemaVersion: 2`.
- Detectar modo desde gateways: `gw-pvp`, `gw-pve` si aparece, `gw-pvp-season`.
- Leer `push-notifications` y, si aporta señal util, `output` de forma controlada.
- Reportar `profileId`, `mode`, `clientVersion`, `logVersionRange`, `unknownTaskIds`.
- Mantener v1 importable para usuarios existentes.

### Phase 3 - Datos de misiones modernos

- Ampliar `Task` con objective-level maps, trader LL y unlockKind.
- Regenerar `tasks.json` cuando API vuelva o crear fallback Fandom.
- Cambiar `buildGoals`: Kappa actual como goal compuesto, no como lista antigua de Kappa tasks.
- Marcar data confidence: `verified`, `stale`, `fallback-wiki`, `unknown`.

### Phase 4 - UI perfecta para el nuevo Tarkov

- Mission Control por perfil/modo.
- Vista Trader LL: columnas por trader y LL, grupos de 2-4 tasks.
- Raid planner por objective maps, no solo task.location.
- Quest tree reducido a cadenas reales; pools LL van en tablero.
- Collector page nueva: LL4 traders + Fence karma + kept quests + streamer items.

## Riesgos / bloqueadores

- `tarkov.dev` esta caido ahora mismo para GraphQL. No se debe inventar sync verde.
- Fandom no siempre expone estructura machine-readable para LL/unlock groups; puede requerir parser MediaWiki por pagina.
- Logs contienen profile IDs/account-like values; cualquier fixture debe redactar o sintetizar.
- Los conteos de logs no son foto completa del perfil; solo eventos retenidos.

## Decisiones recomendadas

- No eliminar `tasks.json` viejo todavia; congelarlo como snapshot legacy hasta tener sync nuevo.
- No rehacer UI antes de modelo/importer: seria pintar datos equivocados mas bonito.
- Priorizar importer+profiles porque desbloquea valor inmediato con los logs reales del usuario.
- Tratar `countsForKappa` como legacy/display, no como verdad del goal Kappa actual.
