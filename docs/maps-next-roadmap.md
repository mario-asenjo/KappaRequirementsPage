# Roadmap de mapas interactivos: mejor que MapGenie

Fecha: 2026-06-12
Estado: aparcado intencionadamente para retomar despues de la proxima funcionalidad grande.

## Objetivo

Convertir `/maps` en una experiencia de mapas de Escape from Tarkov mas completa que MapGenie para el caso de uso de KappaTracker:

- cubrir todos los mapas, no solo los que tenga una referencia externa concreta;
- conectar marcadores con progreso real de quests, objetivos activos, prerequisitos, traders y nivel PMC;
- mantener datos auditables y extensibles desde TarkovBuddy, tarkov.dev, EFT Wiki/Fandom y revision manual;
- ofrecer una UX de raid planning, no solo un atlas con pins.

## Estado actual despues de #49

La ruta `/maps` ya tiene una primera plantilla interactiva:

- Customs y Ground Zero como mapas piloto.
- Imagen local por mapa basada en el contrato observado de TarkovBuddy.
- Marcadores x/y porcentuales con capas y filtros.
- Pan libre por drag.
- Zoom por botones, rueda y teclado.
- Reset de camara.
- Labels pequenos bajo los marcadores.
- Panel contextual al seleccionar un marker.
- Lista de markers cercanos.
- Captura/copia de coordenadas normalizadas.
- Benchmark de MapGenie documentado en `docs/mapgenie-interactive-map-benchmark.md`.
- Contrato de datos documentado en `docs/map-data-contract.md`.
- Benchmark de TarkovBuddy documentado en `docs/tarkovbuddy-map-benchmark.md`.

Decision actual de fuentes:

- MapGenie: benchmark de UX solamente. No depender de su runtime ni copiar assets/media propietarios sin licencia clara.
- TarkovBuddy: bootstrap de imagenes y coordenadas x/y porcentuales cuando exista cobertura.
- tarkov.dev: catalogo canonico de mapas/quests/items/traders cuando lo exponga.
- EFT Wiki/Fandom: fuente textual jugable y validacion manual de contexto.
- Capturas/media propias o fuentes con licencia clara: requisito para enriquecer fichas con fotos.

## Vision: que significa "mejor que MapGenie"

MapGenie gana en interaccion y densidad de datos, pero KappaTracker puede ganar en contexto personalizado:

1. Progreso conectado al tracker
   - Mostrar solo quests activas/iniciadas, bloqueadas o relevantes para Kappa/Lightkeeper.
   - Diferenciar objetivos ya completados, disponibles, bloqueados y opcionales.
   - Cambiar capas segun objetivo global: Kappa, Lightkeeper, todas las quests o achievement seleccionado.

2. Planificacion de raid
   - Generar rutas sugeridas por mapa segun objetivos activos.
   - Agrupar objetivos cercanos y extracts recomendados.
   - Mostrar prerequisitos/llaves necesarias antes de entrar a raid.
   - Resumir "que llevar" y "que visitar" por mapa.

3. Cobertura total
   - Misma plantilla para Customs, Woods, Interchange, Shoreline, Reserve, Lighthouse, Streets, Factory, The Lab y variantes futuras.
   - Los mapas sin datos completos deben mostrar un estado parcial honesto, no una pantalla rota.

4. Fichas enriquecidas y verificables
   - Titulo, categoria, descripcion, trader/quest/item asociado.
   - Fotos/capturas verificadas por marker.
   - Requisitos: llaves, condiciones de extract, energia, co-op, flare, transits, etc.
   - Links a wiki/tarkov.dev y fecha de ultima verificacion.

5. UX de mapa moderna
   - Pan/zoom suave y zoom al cursor.
   - Labels inteligentes por zoom/categoria.
   - Clustering o decluttering cuando haya demasiados pins.
   - Busqueda por quest, item, extract, trader, llave o texto libre.
   - Panel lateral de resultados, no solo filtros.
   - Persistencia por usuario de mapa, zoom, filtros y capas.

## Gaps importantes pendientes

### P0 - Calidad base antes de ampliar muchos mapas

Estos puntos deberian resolverse antes de meter todos los mapas grandes:

- Zoom al cursor: ahora el zoom funciona, pero deberia conservar el punto bajo el raton como ancla.
- Bounds y constraints: evitar que el usuario pueda perder el mapa completamente al hacer pan.
- Decluttering de labels: ocultar/mostrar labels segun zoom, tipo de marker y prioridad.
- Clustering simple: agrupar categorias densas cuando zoom sea bajo.
- Resultado lateral de busqueda: listar markers filtrados con click para enfocar.
- Estado vacio por seleccion: mantener panel contextual claro cuando no hay marker seleccionado.
- Pruebas UI especificas de interaccion: pan, zoom, click marker, busqueda y keyboard.

### P1 - Datos y contrato

- Normalizar `media` opcional por marker:
  - `type`: `image`, `video`, `wiki`, `external-link`.
  - `src` o `url`.
  - `caption`.
  - `sourceId`.
  - `license` / `licenseNote`.
  - `capturedAt` o `retrievedAt`.
- Ampliar marker metadata:
  - `requiredKeys`.
  - `extractRequirements`.
  - `traderIds`.
  - `taskIds` y `objectiveIds` reales enlazados a `src/data/tasks.json`.
  - `itemIds` si aplica.
  - `dangerLevel` o notas tacticas opcionales.
- Definir `mapTransforms.json` real para convertir entre source image pixels, world coords y normalized x/y cuando haya datos de distintas fuentes.
- Separar markers generados de markers curados manualmente para que el extractor no pise revisiones humanas.

### P1 - Integracion con progreso

- Filtro `Active only` real usando progreso/importacion de logs.
- Filtro `Kappa only` real usando `kappaRequired` y objetivo seleccionado.
- Mostrar estado por marker:
  - completed;
  - available;
  - locked by prerequisite;
  - active/imported-started;
  - failed/closed if applicable.
- Badge de trader y nivel PMC requerido.
- Boton "planear raid" desde misiones activas por mapa.

### P2 - Cobertura de mapas

Orden recomendado:

1. Customs: mapa de referencia para validar la plantilla completa.
2. Woods: siguiente mapa conocido por el usuario; buen test de escala y marcadores dispersos.
3. Interchange: buen test de varias plantas/interiores y experiencia MapGenie-like.
4. Shoreline: test de densidad media y resort/interiores.
5. Reserve: bunker/interior/exterior y extracts condicionales.
6. Streets of Tarkov: stress test de densidad y rendimiento.
7. Lighthouse: rogues, extracts y zonas peligrosas.
8. Factory / The Lab: mapas compactos e interiores.
9. Variantes futuras segun wipes/patches.

### P2 - Raid planner

- Vista "Objectives on this map" conectada al tracker.
- Agrupar objetivos cercanos.
- Ordenar por distancia aproximada o zona.
- Sugerir extracts compatibles y transits.
- Exportar checklist de raid.
- Modo "solo lo que necesito para Kappa".

### P3 - Comunidad y curacion

- Modo interno de auditoria de coordenadas:
  - click para copiar x/y;
  - formulario de marker draft;
  - estado `needs-review`;
  - diff claro entre generado y curado.
- Guia para contribuciones de markers/fotos.
- Issue template para reportar coordenada incorrecta.
- Tabla de cobertura por mapa y categoria.

## Arquitectura recomendada al retomar

### Componentes frontend

Propuesta de separacion para que `InteractiveMapsPage.tsx` no crezca indefinidamente:

```text
src/pages/InteractiveMapsPage.tsx
src/components/maps/MapViewport.tsx
src/components/maps/MapLayerSidebar.tsx
src/components/maps/MapMarkerButton.tsx
src/components/maps/MapDetailPanel.tsx
src/components/maps/MapSearchResults.tsx
src/components/maps/MapControls.tsx
src/components/maps/MapSourceStrip.tsx
src/hooks/useMapCamera.ts
src/hooks/useMapFilters.ts
src/hooks/useMapMarkers.ts
src/utils/mapGeometry.ts
```

### Utilidades prioritarias

`src/utils/mapGeometry.ts` deberia concentrar logica pura testeable:

- `screenToNormalizedPoint(...)`
- `normalizedToScreenPoint(...)`
- `zoomAtPoint(...)`
- `clampPanToBounds(...)`
- `distanceBetweenMarkers(...)`
- `clusterMarkers(...)`
- `shouldShowMarkerLabel(...)`

### Tests recomendados

Crear o ampliar:

```text
scripts/testMapCamera.ts
scripts/testMapFilters.ts
scripts/testMapMarkers.ts
scripts/testMapData.ts
```

Casos minimos:

- zoom al cursor conserva el punto bajo el raton;
- pan no permite perder completamente el mapa;
- click en mapa traduce coordenadas correctamente con zoom/pan/aspect ratio;
- drag no copia coordenadas;
- marker selection abre panel correcto;
- labels se ocultan/muestran segun zoom y prioridad;
- filtros `Active only`/`Kappa only` se conectan al progreso cuando existan datos.

## Criterios de aceptacion para la siguiente iteracion de mapas

Una iteracion nueva de mapas no deberia considerarse lista hasta cumplir:

- `npm exec tsc -- --noEmit` pasa.
- `npm run test:maps` pasa.
- `npm run test:map-markers` pasa.
- Nuevos tests de camara/filtros pasan si se toca interaccion.
- `npm run build` pasa.
- Browser smoke en `/maps`:
  - abrir Customs;
  - hacer zoom al cursor;
  - arrastrar mapa;
  - buscar un extract;
  - seleccionar un marker;
  - cambiar a Ground Zero y volver;
  - comprobar consola sin errores.
- Si se anade media, cada asset tiene fuente/licencia documentada.

## Riesgos y decisiones pendientes

1. Licencias de assets
   - No asumir que MapGenie o TarkovBuddy permiten copia de media.
   - Mantener atribucion y documentar licencia si se verifica.

2. Rendimiento
   - Customs ya puede mostrar muchos markers; Streets puede necesitar clustering/virtualizacion.
   - Evitar recalcular geometria pesada en cada render.

3. Complejidad de interiores/plantas
   - Interchange, Reserve, Labs y Streets pueden requerir floors/layers reales.
   - Definir `floorId` o `layerId` antes de meter datos multi-planta.

4. Datos generados vs curados
   - Si `update:maps` o scripts futuros regeneran markers, proteger campos manuales.
   - Usar overlays curados o merges deterministas.

5. Alcance
   - No intentar completar todos los mapas en una sola PR.
   - Customs debe seguir siendo la plantilla de referencia antes de escalar.

## Backlog sugerido listo para issues

### Epic: Map camera and density

- Implementar `useMapCamera` con zoom al cursor.
- Clampear pan para mantener mapa parcialmente visible.
- Extraer transformaciones a `src/utils/mapGeometry.ts`.
- Anadir tests de geometria/camara.
- Implementar labels por prioridad y zoom.
- Implementar clustering simple por grid.

### Epic: Marker detail and media

- Extender contrato con `media` verificable.
- Crear `MapDetailPanel` reutilizable.
- Anadir screenshots propias para 3-5 extracts de Customs como piloto.
- Documentar politica de licencias para media.

### Epic: Progress-aware maps

- Conectar markers con `taskIds` reales.
- Implementar `Active only` y `Kappa only` reales.
- Mostrar estado de quest en marker y panel.
- Crear vista "objectives on this map".

### Epic: Map coverage expansion

- Woods como siguiente mapa completo.
- Interchange con soporte inicial de interiores/floors.
- Tabla de cobertura por mapa/categoria.
- Script para detectar mapas sin marker file o con marker file incompleto.

### Epic: Contribution workflow

- Issue template para coordenada incorrecta.
- Guia de aportacion de markers/media.
- Modo auditoria o script para crear draft markers.

## Nota para el siguiente agente

Cuando volvamos a mapas, empezar por `P0 - Calidad base antes de ampliar muchos mapas`. No saltar directamente a meter mas JSON si la camara, labels y filtros no estan refinados. La promesa de "mejor que MapGenie" depende menos de tener muchos pins y mas de que KappaTracker entienda que pins importan para el progreso real del jugador.
