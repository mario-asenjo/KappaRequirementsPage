# Contrato de datos para mapas interactivos

Este documento define el contrato inicial para que KappaTracker pueda renderizar mapas interactivos con marcadores precisos de quests, items, extracts, spawns, bosses y transits sin acoplar el frontend a una unica fuente de datos.

## Fuentes base

- `tarkov.dev` GraphQL queda como fuente canonica para catalogo de mapas, IDs, `normalizedName` y enlaces de wiki. Verificado con `maps { id name normalizedName wiki }`.
- La Escape from Tarkov Wiki en Fandom queda como fuente primaria para informacion jugable textual: ubicaciones de quests, extracts, bosses, transits y condiciones. Si automatizar Fandom queda bloqueado por proteccion anti-bot, los datos se importaran conservando URL, fecha y revision manual.
- Las coordenadas exactas no se inventan: solo se publicaran como `exact`/`high` tras auditoria manual o transformacion documentada en `mapTransforms.json`.
- Referencias comunitarias externas pueden ayudar a contrastar, pero deben etiquetarse como auxiliares y no reemplazan la wiki.

## Objetivos

- Mantener los datos auditables: cada coordenada debe tener fuente, fecha y confianza.
- Separar mapa base, capas y marcadores para poder cambiar proveedor visual sin migrar todo el modelo.
- Vincular marcadores con `task.id`, objectives, items, traders y estados del tracker.
- Permitir varias coordenadas por objetivo cuando una quest puede completarse en varias zonas.
- Soportar precision gradual: exacta, area aproximada o solo mapa conocido.

## Principios de precision

1. No usar coordenadas sin fuente.
2. No mezclar sistemas de coordenadas: todo marcador debe declarar `coordinateSpace`.
3. Toda coordenada transformada debe conservar `sourceCoordinate` y `transformId`.
4. Si una ubicacion no es exacta, usar `shape: "area"` con poligono/circulo y `confidence` menor que `high`.
5. Un marcador puede estar oculto por estado si depende de nivel, trader, prerequisitos o quest activa.

## Versionado

Los ficheros se versionan con `schemaVersion`. Cambios compatibles incrementan `revision`; cambios incompatibles incrementan `schemaVersion`.

```ts
export type MapContractVersion = 1;
export type MapRevision = string; // ISO date or git/data revision
```

## Ficheros propuestos

```text
src/data/maps/index.json
src/data/maps/<mapId>.json
src/data/mapMarkers/<mapId>.json
src/data/mapSources.json
src/data/mapTransforms.json
```

## Estado actual del piloto Ground Zero

- `src/data/mapMarkers/ground-zero.json` contiene el primer set renderizable.
- Fuentes: contrato visual y `staticMarkers["Ground Zero"]` de la ruta pública TarkovBuddy `/maps`; EFT Wiki/Fandom y `tarkov.dev` se mantienen para contexto jugable.
- Capas con marcadores: `extracts`, `spawns`, `bosses`/cultists y `transits`.
- La visual usa una imagen local `/images/maps/ground-zero-tarkovbuddy.webp` con coordenadas x/y porcentuales, igual que el contrato observado de TarkovBuddy.
- El benchmark de UI/contrato vive en `docs/tarkovbuddy-map-benchmark.md`; si aparece repo/licencia oficial visible, actualizar atribución antes de ampliar assets.

## `maps/index.json`

Catalogo de mapas disponibles.

```json
{
  "schemaVersion": 1,
  "revision": "2026-06-07",
  "maps": [
    {
      "id": "customs",
      "name": "Customs",
      "normalizedName": "customs",
      "enabled": true,
      "layers": ["surface"],
      "minPmcLevelHint": 1,
      "bounds": {
        "coordinateSpace": "normalized-2d",
        "min": { "x": 0, "y": 0 },
        "max": { "x": 1, "y": 1 }
      }
    }
  ]
}
```

## `<mapId>.json`

Metadata del mapa y assets base.

```json
{
  "schemaVersion": 1,
  "mapId": "customs",
  "name": "Customs",
  "revision": "2026-06-07",
  "coordinateSpaces": [
    {
      "id": "normalized-2d",
      "type": "image-normalized",
      "description": "x/y normalizados de 0 a 1 sobre el asset base",
      "origin": "top-left",
      "units": "ratio"
    },
    {
      "id": "game-world",
      "type": "world",
      "description": "Coordenadas extraidas/transformadas desde datos de juego si existen",
      "origin": "unknown",
      "units": "meter"
    }
  ],
  "baseLayers": [
    {
      "id": "surface",
      "name": "Surface",
      "asset": "/maps/customs/surface.webp",
      "width": 4096,
      "height": 4096,
      "coordinateSpace": "normalized-2d",
      "sourceId": "manual-map-v1",
      "licenseNote": "Ver mapSources.json"
    }
  ]
}
```

## `mapMarkers/<mapId>.json`

Marcadores renderizables. Un marcador no es solo un punto: puede ser punto, area o ruta.

```json
{
  "schemaVersion": 1,
  "mapId": "customs",
  "revision": "2026-06-07",
  "markers": [
    {
      "id": "customs-task-saving-the-mole-location-a",
      "type": "task-objective",
      "label": "Saving the Mole: objective area",
      "description": "Area donde se puede completar el objetivo principal.",
      "coordinateSpace": "normalized-2d",
      "geometry": {
        "shape": "area",
        "points": [
          { "x": 0.42, "y": 0.38 },
          { "x": 0.46, "y": 0.38 },
          { "x": 0.46, "y": 0.42 },
          { "x": 0.42, "y": 0.42 }
        ]
      },
      "links": {
        "taskIds": ["59689ee586f7740d1570bbd5"],
        "objectiveIds": [],
        "itemIds": [],
        "traders": ["Mechanic"]
      },
      "visibility": {
        "requiresTaskActive": false,
        "requiresTaskKnown": false,
        "minPmcLevel": 1,
        "editions": []
      },
      "metadata": {
        "confidence": "medium",
        "precision": "area",
        "sourceIds": ["wiki-saving-the-mole-2026-06-07"],
        "lastVerifiedAt": "2026-06-07T00:00:00.000Z",
        "verifiedBy": "manual-review",
        "notes": "Area aproximada hasta validar con fuente primaria o screenshot calibrada."
      }
    }
  ]
}
```

## Tipos principales

```ts
export type MapMarkerType =
  | 'task-objective'
  | 'quest-item'
  | 'extract'
  | 'spawn'
  | 'boss'
  | 'cultist'
  | 'transit'
  | 'key-door'
  | 'loot'
  | 'note';

export type MapMarkerConfidence = 'high' | 'medium' | 'low';
export type MapMarkerPrecision = 'exact' | 'area' | 'route' | 'map-only';

export type MapGeometry =
  | { shape: 'point'; point: { x: number; y: number; z?: number } }
  | { shape: 'area'; points: Array<{ x: number; y: number; z?: number }> }
  | { shape: 'circle'; center: { x: number; y: number; z?: number }; radius: number }
  | { shape: 'route'; points: Array<{ x: number; y: number; z?: number }> };
```

## `mapSources.json`

Fuente, licencia y auditoria. Cada marker debe referenciar `sourceIds`.

```json
{
  "schemaVersion": 1,
  "sources": [
    {
      "id": "wiki-saving-the-mole-2026-06-07",
      "name": "Escape from Tarkov Wiki - Saving the Mole",
      "url": "https://escapefromtarkov.fandom.com/wiki/Saving_the_Mole",
      "kind": "wiki",
      "license": "CC-BY-SA or source-specific",
      "retrievedAt": "2026-06-07T00:00:00.000Z",
      "confidence": "medium"
    }
  ]
}
```

## `mapTransforms.json`

Transformaciones conocidas entre coordenadas de fuente y asset base.

```json
{
  "schemaVersion": 1,
  "transforms": [
    {
      "id": "customs-wiki-image-to-normalized-v1",
      "mapId": "customs",
      "from": "source-image-pixels",
      "to": "normalized-2d",
      "method": "affine",
      "controlPoints": [
        { "source": { "x": 0, "y": 0 }, "target": { "x": 0, "y": 0 } },
        { "source": { "x": 4096, "y": 4096 }, "target": { "x": 1, "y": 1 } }
      ],
      "rmsError": null,
      "createdAt": "2026-06-07T00:00:00.000Z"
    }
  ]
}
```

## Validacion minima antes de aceptar datos

- `mapId` existe en `maps/index.json`.
- `coordinateSpace` existe en `<mapId>.json`.
- Todas las coordenadas normalizadas estan en rango `[0, 1]`.
- `geometry.shape` coincide con los campos esperados.
- `sourceIds` no esta vacio.
- `confidence` y `precision` existen.
- `taskIds` existen en `src/data/tasks.json` si se declaran.
- Marcadores con `confidence: low` no deben aparecer como exactos en la UI.

## Implicaciones UX

- Filtros base: mapa, tipo de marcador, trader, quest activa, item, llave, confianza.
- La UI debe diferenciar visualmente exacto vs area aproximada.
- Si un objetivo tiene varias ubicaciones posibles, mostrar todas con label claro.
- Para raid planner, priorizar marcadores relacionados con quests iniciadas/activas.
- Para datos de baja confianza, mostrar aviso y fuente, no ocultarlos silenciosamente.

## Primer vertical slice recomendado

1. Crear `src/data/maps/index.json` con todos los mapas habilitados pero sin assets pesados.
2. Crear contrato TypeScript y validador Node para marker files.
3. Añadir un mapa piloto con marcadores de quests de alta confianza.
4. Renderizar visor simple con pan/zoom y filtros por quest activa.
5. Conectar Raid Planner para abrir mapa filtrado por tasks pendientes.
