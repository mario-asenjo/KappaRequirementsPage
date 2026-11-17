# Plan PvE-first: KappaTracker alineado con Tarkov 1.3 (PvE Zone)

Fecha: 2026-11-17
Rama: `docs/pve-first-plan`
Estado: propuesta para iterar. Epic: #64 (sub-issues #65-#81). Fuente de las issues: `docs/pve-first/issues/`.

## 1. Objetivo

Convertir KappaTracker en un tracker **PvE Zone primero**, en el que datos, extractor de logs y vistas describan el juego tal y como es hoy (1.3.x), sin mezclar datos legacy, tareas de otro modo o de otra faccion. PvP Zone y PvP Season siguen soportados como perfiles secundarios con el mismo pipeline, pero toda decision de UX se toma pensando en PvE.

Principios:

1. **Un dataset por modo.** Nada de catalogos "regular" sirviendo para PvE.
2. **Progreso por perfil.** Cada perfil = `mode + profileId (+ prestige)`. Nunca se mezclan eventos de sesiones de modos distintos.
3. **Puertas reales, no listas legacy.** Kappa/Lightkeeper/Prestige se modelan con sus condiciones actuales (LL, karma, nivel, tasks, items).
4. **Procedencia visible.** Cada dataset lleva `gameMode`, `syncedAt` y version de juego; la UI la muestra.
5. **No inventar.** Lo que no venga de fuente se marca `unknown`, no se rellena.

## 2. Estado verificado

### 2.1 Juego (fuentes publicas)

| Version | Fecha | Impacto en KappaTracker |
| --- | --- | --- |
| 1.1.0 (Kord Breach) | 2026 | Seasonal Character independiente; side tasks atadas a Trader LL en grupos de 2-4; Collector con nuevas puertas. |
| 1.1.5.0 | sep-2026 | Rework Lighthouse y acceso a Lightkeeper; indicador de tasks con entrega disponible. |
| 1.2.0.0 | 06-oct-2026 | **Prestige PvE de 6 niveles** (resetea solo perfil PvE, conserva hasta 50% skills/maestria; Gamma como recompensa), rework bots PMC PvE, Customs (extracciones, ZB-1013 key, Guard Post key) e Interchange, spawns PMC en Labyrinth, programa EXFIL Brothers. |
| 1.3.0.0 | 29-oct-2026 | Evento Halloween (tasks temporales, Infected maps), bots PMC PvE de alta dificultad en mapas de nivel alto. |
| 1.3.5.0 | "mediados de noviembre" | Migracion a Unity 6. **Riesgo**: cambios en nombre/formato/ubicacion de logs. Verificar con logs reales. |

### 2.2 Datos de referencia hoy (`json.tarkov.dev`, descargados 2026-11-17)

| Metrica | PvE (`/pve`) | PvP (`/regular`) | `main` actual |
| --- | --- | --- | --- |
| Tasks | 499 | 503 | 499 (GraphQL, 2026-06-07) |
| `kappaRequired` | 13 | 13 | 257 (`countsForKappa` legacy) |
| `lightkeeperRequired` | 0 | 0 | 102 |
| Tasks con mapa por objetivo | 338 | - | 0 (solo `location`, 241 vacias) |
| Achievements | 131 | - | 109 |
| Prestige | 6 niveles | - | no modelado |
| Quest items | 138 | - | no modelado |

Diferencias `main` vs PvE actual (por ID):

- **Sobran en main (46)**: 23 `[PVP ZONE]`; 4 `New Beginning` (solo PvP); 19 eliminadas del juego: `Make Amends` (x3) y variantes Buyout/Equipment/Quarantine/Security/Software/Sweep Up, `Assessment - Part 1-3`, `Network Provider - Part 1-2`, `Getting Acquainted`, `Key to the Tower`, `Knock-Knock`, `Capacity Check`, `Forklift Certified`.
- **Faltan en main (46)**: 23 `[PVE ZONE]` y 23 nuevas: A Bitter Victory, A Wedge Between Us, Akimbo, Biochemistry, Can't Drink Away Skill, Demonstration Model, Fall Ailment, Fresh Stock, Hangover, Hiking, Invasive Therapy, Oil Change, Peaceful Atom, Saving Private Roman, Secret Message, Sisyphus, Stick to It, Stimulating Demand, The Huntsman Path - Administrator, The Huntsman Path - Control, The Tarkov Butcher, War Never Changes, Wiring the Vessel.
- Desde la snapshot de #60 (2026-09-28, 512 tasks): -18 (cadena Lightkeeper antigua) y +5 (Can't Drink Away Skill, Invasive Therapy, Akimbo, Stimulating Demand, Sisyphus).

Campos estructurados nuevos por task (PvE):

| Campo | Tasks | Uso previsto |
| --- | --- | --- |
| `traderRequirements` (LL) | 105 | Gate de LL; LL board. |
| `otherRequirements.globalVariable` | 168 | Contadores de pool LL (agrupan tasks que se desbloquean juntas). Que tasks incrementan cada contador **no** esta expuesto: requiere capa wiki. |
| `otherRequirements.dialogue` | 12 | Desbloqueo por dialogo con trader. |
| `factionName` | 17 BEAR / 17 USEC | Filtrar por faccion del perfil. |
| `neededKeys` | 57 | Planner de llaves (#30). |
| `failConditions` / `failureOutcome` | 36 | Avisos de fallo y ramas alternativas. |
| `restartable` | 16 | Re-hacer tras fallo. |
| `availableDelaySeconds*` | 10 | Lightkeeper (10 h) y Sensory Analysis 1 (30-35 min). |
| `finishRewards.*Unlock` | varios | offer/craft/trader/location unlocks: "por que hacer esta task". |
| `objectives[].type/maps/zones/items/count/foundInRaid` | todas | Mapas por objetivo, items FiR, planner. |

Collector (PvE, hoy): nivel 42; LL4 con Prapor, Therapist, Skier, Peacekeeper, Mechanic, Ragman y Jaeger; **Fence LL3**; tasks previas Chemical - Part 3, Sew it Good - Part 2, Shooter Born in Heaven, The Tarkov Shooter - Part 4 y **Postman Pat - Part 2** (la issue #57 solo listaba 4); 44 items de streamers FiR. Cadena Kappa completa = 13 tasks (incluida Collector).

Prestige PvE (hoy): P1 nivel 15 + 5M rublos; P2 nivel 25 + skills + estaciones + 10M; P3 nivel 35 + 15M; P4 nivel 40 + 15M; P5/P6 nivel 47 + taskStatus + estaciones nivel 3 + 20M.

### 2.3 Repositorio

- `main` @ `f137103` (#52). CI: tests de scripts + build.
- Trabajo 1.1 huerfano: #59 (discovery) y #60 (pipeline JSON PvE, tipos `objectiveDetails`/`provenance`) mergeados en `feat/item-barter-trades-panel`; #61 cerrado sin merge. Este plan rescata los 3 docs de discovery a esta rama.
- PR #62 (barters, JSON PvE): valido como base de Fase 1 (items).
- PR #63 (perfil/modo, importer v2): el modelo `ProfileProgress`/`UserProgress v2` es reutilizable; el parser **no**: elige un unico modo global (`modes[0]`), lee `output_*.log` sin deduplicar con `push-notifications`, usa una regex de version generica y compacta el codigo en lineas ilegibles.
- Fuentes legacy aun activas: `fetchTasks.ts`, `fetchAchievements.ts` y `fetchItemRequirements.ts` usan `api.tarkov.dev/graphql` (en mantenimiento desde julio 2026).
- Catalogo de mapas: falta `Infected Factory`, `Infected Lab`, `The Lab (Dark)` (variantes de evento). Markers solo en Customs y Ground Zero.

### 2.4 Logs

**Pendiente**: la carpeta de logs no llego a esta sesion. Lo que sabemos viene del discovery (2026-09-28): carpetas `log_YYYY.MM.DD_HH-MM-SS_<version>` de 1.0.4.6 a 1.1.5.1; senales de modo `gw-pvp`, `gw-pvp-season`, `onlinePveRaidStates`, `TRACE-NetworkGameCreate ... GameMode`; eventos de quest en `push-notifications_*.log` y tambien en `output_*.log`; 7 IDs sin resolver (ver 2.5). #66 define la certificacion.

### 2.5 IDs de logs sin resolver

`69fa5e0f04087f435106b9c7`, `6a1c766939a00fb24a0b8d25`, `6a1c79503bec45f2d70000da`, `6a39936fec86c6005a0656c1`, `6a446573cd2959c3a609f2a9`, `6a7637fed31fb1191903fc07`, `6a91840a740be0cff50e0310`.

Hoy no existen ni en `/pve/tasks` ni en `/regular/tasks`. Hipotesis a validar con logs: tasks de evento temporal, Seasonal PvP, Arena o tareas de Battle Pass. Hasta entonces: clasificar como `unresolved`, nunca como completadas.

## 3. Arquitectura objetivo

### 3.1 Datos

```
scripts/data-sources/tarkovDevJson.ts      fetch por modo (pve | regular), con cache y error accionable
scripts/data-normalizers/*.ts             tasks, achievements, prestige, questItems, items, hideout
scripts/data-sources/fandom*.ts           capa semantica (Collector, pools LL, reglas)
src/data/pve/{tasks,achievements,prestige,goals,questTree,itemRequirements}.json
src/data/pvp/...                          mismo esquema
src/data/catalog-index.json               ids conocidos por modo + tombstones (eliminadas/renombradas)
```

Esquema `Task` objetivo (amplia el de #60):

```ts
interface Task {
  id: string; title: string; normalizedName?: string; trader: string;
  gameMode: 'pve' | 'pvp';               // dataset de origen
  modeExclusive?: boolean;               // [PVE ZONE] / [PVP ZONE]
  faction?: 'BEAR' | 'USEC';             // ausente = ambas
  location?: string; objectiveMaps: string[];
  levelRequirement?: number;
  requiredTraderLoyaltyLevel?: number;
  unlock: {
    prerequisites: { id: string; status: ('complete'|'active'|'failed')[] }[];
    traderLevels: { trader: string; level: number }[];
    pools: { variableId: string; minValue: number; label?: string }[];   // globalVariable
    dialogue?: string[];                 // traders
  };
  objectives: TaskObjective[];           // type, description, maps, items, count, foundInRaid, optional
  neededKeys: { keys: string[]; map?: string }[];
  failConditions?: TaskObjective[]; restartable?: boolean;
  availableDelaySeconds?: { min: number; max: number };
  rewards: { experience?: number; standing?: {trader:string;value:number}[]; unlocks: RewardUnlock[]; achievements: AchievementReference[] };
  kappaRequired: boolean;                // flag actual de la fuente
  legacy?: { countsForKappa?: boolean; lightkeeperRequired?: boolean };
  provenance: SourceProvenance[]; sourceConflicts?: SourceConflict[];
  dataConfidence: 'verified' | 'structured' | 'fallback-wiki' | 'unknown';
}
```

### 3.2 Progreso

```ts
type GameMode = 'pve' | 'pvp' | 'seasonal-pvp';
interface ProfileProgress {
  mode: GameMode; profileId?: string; label?: string;
  faction?: 'BEAR' | 'USEC'; prestigeLevel: number; playerLevel: number;
  traderLoyalty: Record<string, number>; fenceLevel?: number;
  completedTaskIds: string[]; startedTaskIds: string[]; failedTaskIds: string[];
  collectorItemsHandedOver: string[];
  completedAchievementIds: string[]; manualAchievementProgress: Record<string, boolean>;
  selectedGoalId: string; lastImport?: ProgressImportSummary;
  prestigeHistory?: { level: number; archivedAt: string; completedTaskIds: string[] }[];
}
interface UserProgress { version: 3; activeProfileKey: string; profiles: Record<string, ProfileProgress> }
```

Migracion: v1 (`userProgress` global) y v2 (PR #63) -> v3 en perfil `pve:default`, conservando IDs, y pasando cada ID por la tabla de reconciliacion (#72).

### 3.3 Extractor

- Unidad de analisis = **sesion** (carpeta `log_*`), no el arbol completo.
- Por sesion: `clientVersion` (del nombre de carpeta), `mode` (senales ponderadas), `profileId` (redactable), eventos con timestamp.
- Eventos de `push-notifications` y `output` deduplicados por `(taskId, suffix, timestamp aproximado)`.
- Estado final por task = ultimo evento cronologico (soporta `restartable` y fallos).
- Salida `schemaVersion: 2` con `profiles[]` (uno por `mode+profileId`), cada uno con sus listas, `versionRange`, `sessionCount` y `unknownTaskIds` clasificados.
- v1 sigue importable.

## 4. Fases

| Fase | Issue | Titulo | Depende de | Prioridad |
| --- | --- | --- | --- | --- |
| 0 | #65 | Saneamiento de backlog, ramas y PRs | - | P1 |
| 0 | #66 | Certificacion con logs reales 1.0 -> 1.3.x | logs del usuario | P1 |
| 1 | #67 | Pipeline de tasks multi-modo desde json.tarkov.dev | #65 | P1 |
| 1 | #68 | Achievements, prestige y quest items por modo | #67 | P1 |
| 1 | #69 | Items, hideout y barters PvE (integra #62) | #67 | P2 |
| 1 | #70 | Capa semantica wiki: Collector, pools LL, reglas PvE | #67 | P2 |
| 2 | #71 | Progreso por perfil/modo, faccion, LL y prestige | #67 | P1 |
| 2 | #72 | Reconciliacion de IDs y migracion de progreso existente | #67, #71 | P1 |
| 3 | #73 | Extractor 2.0: atribucion por sesion | #66, #67 | P1 |
| 3 | #74 | Importador web v2 por perfil | #71, #73 | P1 |
| 3 | #75 | Distribucion del extractor (ZIP/mjs) post Unity 6 | #73 | P2 |
| 4 | #76 | Shell y Mission Control PvE-first | #71 | P1 |
| 4 | #77 | Collector/Kappa 1.3 y Lightkeeper actual | #68, #70, #71 | P1 |
| 4 | #78 | Quests (lista, detalle, arbol, LL board) con datos 1.3 | #67, #71 | P2 |
| 4 | #79 | Mapas y raid planner sobre objetivos PvE | #67 | P2 |
| 4 | #80 | Prestige y achievements PvE | #68, #71 | P2 |
| 5 | #81 | Invariantes de datos en CI, sync automatico y docs | #67 | P1 |

Camino critico: #65 -> #67 -> #71 -> #72 -> #76/#77, y en paralelo #66 -> #73 -> #74.

Orden de PRs sugerido (pequenos y verificables):

1. `docs/pve-first-plan` (este documento + discovery rescatado).
2. `feat/data-json-multimode` (#67) regenerando `src/data/pve/*` y `src/data/pvp/*`; la app sigue leyendo un alias `src/data/tasks.json -> pve` hasta #71.
3. `feat/data-achievements-prestige` (#68) y `feat/trader-barters-clean` (#62 rebased, 05).
4. `feat/profile-progress-v3` (#71 + #72) reutilizando el modelo de #63.
5. `feat/extractor-sessions` (#73) -> `feat/import-v2-ui` (#74) -> `chore/extractor-dist` (#75).
6. Vistas: #76 -> #77 -> #78/#79/#80.
7. `ci/data-invariants` (#81) puede ir en paralelo desde el paso 2.

## 5. Triaje propuesto de issues existentes

| Issue | Decision | Motivo |
| --- | --- | --- |
| #54 Progreso por modo | Cerrada (2026-11-17) como sustituida de #71 | 07 amplia con faccion, LL, prestige. |
| #55 Importer 2.0 | Cerrada (2026-11-17) como sustituida de #73/#74 | Atribucion por sesion corrige el diseno de #63. |
| #56 Datos 1.1+ (GraphQL) | Cerrada (2026-11-17) como sustituida de #67 | Contexto GraphQL obsoleto. |
| #57 Kappa/Collector 1.1 | Cerrada (2026-11-17) como sustituida de #77 | Datos corregidos (Fence LL3, Postman Pat 2, nivel 42). |
| #36 Spike logs | Cerrada (2026-11-17) como sustituida de #66 | |
| #58 Trader LL board | Mantener, enlazar a #78 | Ahora hay datos (`traderRequirements`, `globalVariable`). |
| #33 Sync automatico | Mantener, re-scope en #81 | JSON multi-modo y PR por modo. |
| #35 Docs/FAQ | Mantener, enlazar a #81 | |
| #25 Iniciadas por logs | Mantener (Fase 4) | Debe ser por perfil. |
| #26 Bloqueadores Kappa | Mantener, depende de #77 | El camino critico cambia con Collector 1.3. |
| #27 Quest tree UX | Mantener, enlazar a #78 | Solo cadenas reales. |
| #28 Raid planner, #41 Mapas | Mantener, enlazar a #79 | |
| #29 Quest items FiR, #30 Llaves | Mantener | Ahora hay `questItems`, `neededKeys`, `foundInRaid`. |
| #39 Hideout | Mantener, enlazar a #69 | PvE hideout + requisitos de Prestige. |
| #42 Economia | Mantener (P3) | Los precios PvE difieren de PvP: usar endpoints `/pve`. |
| #31, #32, #34, #40 | Mantener en backlog | Sin cambios de alcance. |
| PR #63 | Cerrar tras portar el modelo a #71 | Parser con modo global unico. |
| PR #62 | Rebase y merge como parte de #69 | Ya usa JSON PvE. |

Limpieza de ramas: borrar las ~35 ramas remotas ya mergeadas en `main`; conservar `feat/trader-barters-clean` y `feat/profile-mode-importer-v2` hasta cerrar #69/#71.

## 6. Riesgos

- **Unity 6 (1.3.5.0)** puede cambiar logs: #66 debe repetirse con una sesion post-migracion antes de cerrar #73.
- `json.tarkov.dev` no expone que tasks incrementan cada `globalVariable`: los pools LL necesitan capa wiki o inferencia por trader+LL marcada `structured`.
- Tasks de evento (Halloween) entran y salen del catalogo: el indice de tombstones evita "perder" progreso o contar fantasmas.
- Prestige resetea el perfil PvE: hay que archivar progreso, no borrarlo.
- Privacidad: profile IDs se redactan en fixtures y se guardan solo en local.

## 7. Definicion de terminado (epic)

- [ ] Ningun dataset generado depende de `api.tarkov.dev/graphql`.
- [ ] Perfil PvE activo: cero tasks `[PVP ZONE]`, eliminadas o de otra faccion visibles.
- [ ] Kappa = puertas reales de Collector; Lightkeeper y Prestige modelados con datos actuales.
- [ ] Importar logs mixtos PvP/PvE crea/actualiza perfiles separados sin cruces.
- [ ] La UI muestra version de juego y fecha de sync de cada dataset.
- [ ] CI valida invariantes de datos, fixtures del extractor (1.0, 1.1, 1.3, Unity 6) y build.
