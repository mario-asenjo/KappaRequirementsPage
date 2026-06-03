# Plan De Paridad Con `kappas.pages.dev`

Comparativa realizada el 2026-06-02 contra el HTML y bundles publicos de `https://kappas.pages.dev`.

## Funcionalidades De La Referencia Que Faltan O Estan Parciales

- Tablero avanzado de misiones con busqueda global, ordenacion, filtros persistentes, agrupacion por comerciante/mapa, filtro de nivel PMC, filtro `Next Only`, eventos estacionales y badges Kappa/Lightkeeper/BTR.
- Seguimiento granular de objetivos dentro de cada mision, incluyendo contadores para objetivos con cantidades e items asociados.
- Estado `Working On` para misiones, objetivos de storyline, estaciones de hideout y collector items, con una pagina agregada `Currently Working On`.
- Tracker de collector items para `Collector`, con imagenes y progreso por item.
- Tracker de hideout por estaciones/niveles, requisitos de skill/estacion/items, cantidades y marcas FIR.
- Vista agregada de items necesarios que combina requisitos de tareas y hideout, con filtros `All Needed`, `Immediate`, `Tasks`, `Hideout` y `FIR`.
- Vista especifica de requisitos FIR de hideout con filtro por nivel, ocultar encontrados y navegacion a estacion.
- Vista de prestiges con progreso persistente por prestige, requisitos numericos, quests, figurines, extracciones/transits, complete all y reset.
- Vista de storyline 1.0 con objetivos main/optional, progreso por objetivo, items asociados y mapa de decisiones.
- Vista checklist alternativa al tablero, con acordeones, expansion/colapso, panel de prerequisitos y recompensas enriquecidas.
- Mind map/flow view adicionales a nuestro arbol actual.
- Preferencias de usuario mas completas: filtros, layout compacto/estandar, secciones colapsadas, hidden traders e ignored tasks.
- Enriquecimiento de datos de tareas: `wikiLink`, imagenes de traders/items, `maps`, `factionName`, `isEvent`, recompensas estructuradas, requisitos de tareas estructurados y objetivos con metadata de items.
- Metadata SEO/social completa en `index.html`: descripcion, keywords, Open Graph, Twitter card, favicon PNG/apple y analytics opcional.

## Prioridad Recomendada

- Fase 1: tablero avanzado de misiones usando datos actuales: busqueda, sort, agrupacion por comerciante/mapa, filtro nivel, filtro siguiente disponible y ruta `/tasks`.
- Fase 2: ampliar modelo de progreso con `workingOnTaskIds`, `completedTaskObjectives` y progreso numerico de objetivos inferible desde texto.
- Fase 3: extraer/enriquecer items de objetivos desde `tarkov.dev` y construir tracker de items necesarios.
- Fase 4: collector items e hideout, con datos versionados y progreso persistido.
- Fase 5: dashboard `Actualmente trabajando`, integrando misiones, collector, hideout y storyline.
- Fase 6: prestiges y storyline 1.0 con datos propios, avisos de calidad de datos y pruebas.
- Fase 7: SEO/social assets y refinamiento visual de vistas alternativas `flow/mind map`.

## Trabajo Iniciado En Esta Iteracion

- Rama: `feature/reference-parity-plan`.
- Implementar Fase 1 con el minimo cambio util sobre `QuestListPage` y navegacion existente.
