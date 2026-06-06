# MEMORY

## Proyecto

- Repositorio: `mario-asenjo/KappaRequirementsPage`.
- Aplicacion: Kappa Progress Tracker para Escape from Tarkov.
- Stack: React 18, Vite 4, TypeScript, React Router y Bootstrap 5.
- Objetivo: seguimiento local del progreso hacia el contenedor Kappa sin recoger datos personales.

## Estructura Recordada

- `src/App.tsx`: layout principal y rutas.
- `src/main.tsx`: entrada de React e importacion de estilos globales.
- `src/components/`: componentes reutilizables `Header`, `Sidebar` y `TaskCard`.
- `src/pages/`: paginas `Home`, `QuestListPage`, `QuestDetailPage` y `QuestTreePage`.
- `src/hooks/useLocalStorage.ts`: persistencia local de misiones completadas.
- `src/hooks/useProgress.ts`: modelo de progreso persistido en `userProgress`, sincronizado con claves legacy.
- `src/data/tasks.json`: datos versionados de todas las misiones desde `tarkov.dev`, con flags Kappa/Lightkeeper.
- `src/data/achievements.json`: achievements desde `tarkov.dev` enriquecidos con la tabla de la wiki.
- `src/data/goals.json`: perfiles de progreso derivados para Kappa, Lightkeeper, todas las misiones y achievements.
- `src/data/questTree.json`: arbol de misiones generado desde `tasks.json`.
- `src/utils/questTree.ts`: construccion de arbol por comerciante y estados de nodos.
- `src/styles.css`: ajustes visuales y responsivos locales.
- `DESIGN.md`: sistema visual inspirado en Kraken para guiar cualquier cambio de interfaz.
- `scripts/fetchTasks.ts`: sincronizacion de todas las misiones desde `tarkov.dev`.
- `scripts/fetchAchievements.ts`: sincronizacion de achievements desde `tarkov.dev` y wiki.
- `scripts/buildGoals.ts`: generacion de perfiles de progreso derivados.

## Planes Persistentes

- `docs/reference-parity-plan.md`: backlog de paridad contra `kappas.pages.dev`, con brechas detectadas y fases de implementacion.
- `docs/progress-import-plan.md`: fases para importar progreso desde logs locales y construir el extractor externo.

## Convenciones

- Componentes React en PascalCase.
- Tipos compartidos en `src/types.ts`.
- Estilos base con Bootstrap y ajustes propios en `src/styles.css`.
- Look and feel basado en `DESIGN.md`: superficies blancas, texto near-black, acentos `#7132f5`, botones de 12px y sombras suaves.
- Progreso del usuario persistido solo en `localStorage` bajo `completedTasks`.
- Modelo de progreso actual persistido en `localStorage` bajo `userProgress`; mantiene compatibilidad con `completedTasks` y `playerLevel`.
- Las misiones se importan desde `src/data/tasks.json` para quedar incluidas en el bundle de produccion.
- El arbol se puede regenerar con `npm run build:quests`; las pruebas basicas se ejecutan con `npm run test:quests`.

## Fuentes Oficiales De Misiones

- Fuente primaria actual: `https://api.tarkov.dev/graphql`.
- Fuente secundaria para guias externas: `https://escapefromtarkov.fandom.com` enlazada por `wikiLink` cuando la API la expone.
- Ultima sincronizacion registrada: `2026-05-14T14:33:15.426Z`.
- Total registrado de misiones: `499` (`257` Kappa, `102` Lightkeeper).
- Total registrado de achievements: `105`.

## Historial De Cambios

### 2026-06-06 (importacion de progreso fase 3)

- Rama de trabajo: `feature/progress-import`.
- Se investigo que `backend_*.log` conserva endpoints de quest pero no cuerpos de request/response utiles.
- Se identifico `push-notifications_*.log` como fuente viable: `templateId` con sufijo `description` indica inicio, `successMessageText` indica completado y `failMessageText` indica fallo/rama alternativa.
- Se anadio `docs/progress-import-plan.md` para separar importador web, extractor CLI, empaquetado y mejoras de confianza.
- Se anadio la ruta `/import` para cargar un JSON de progreso, validarlo, previsualizar IDs reconocidos/desconocidos y aplicar completadas sin sobrescribir progreso existente.

### 2026-06-06 (importacion de progreso fase 4)

- Rama de trabajo: `feature/eft-log-importer`.
- Se anadio `tools/eft-log-importer` con parser y CLI TypeScript de solo lectura para logs locales.
- El comando `npm run extract:logs -- --eft <EscapeFromTarkov> --out kappa-progress-import.json` escanea `Logs/**/push-notifications_*.log` y emite el contrato aceptado por `/import`.
- El parser interpreta `description` como iniciada, `successMessageText` como completada y `failMessageText` como fallida/alternativa, cruzando IDs contra `src/data/tasks.json`.
- Se anadio `npm run test:extractor` con logs sinteticos para validar completadas, iniciadas, fallidas, perfil y IDs no reconocidos.
- Validacion read-only contra logs locales reales en `/mnt/c/Users/masen/Desktop/EFTINSTALLFOLDER/EscapeFromTarkov`: genero JSON temporal en `/tmp/opencode` con 45 completadas, 43 iniciadas, 3 fallidas/alternativas y 2 template IDs no reconocidos.

### 2026-06-06 (importacion de progreso fase 5)

- Rama de trabajo: `feature/importer-ux`.
- Se mejoro `/import` con pasos de generacion del JSON, comando visible, privacidad, advertencias de limites y detalle desplegable de IDs no reconocidos.
- Se documento `tools/eft-log-importer/README.md` como guia especifica del extractor hasta publicar binarios descargables.
- Se reforzo que el extractor es de solo lectura, no usa credenciales, no hace llamadas de red y que los logs no representan una foto completa del perfil.

### 2026-06-02 (paridad referencia fase 1)

- Rama de trabajo: `feature/reference-parity-plan`.
- Se analizo `https://kappas.pages.dev` inspeccionando HTML y bundles publicos para extraer funcionalidades de referencia.
- Se creo `docs/reference-parity-plan.md` con brechas: tablero avanzado, working-on, objetivos/items, collector, hideout, tracked items, prestiges, storyline, preferencias y SEO.
- Se anadio la ruta `/tasks` como tablero avanzado de misiones del objetivo activo.
- `QuestListPage` ahora soporta busqueda por mision/trader/mapa, ordenacion, agrupacion por comerciante/mapa, filtro de completadas, filtro de disponibles y filtro por nivel PMC.
- `TaskCard` muestra badges de disponibilidad, nivel, Kappa y Lightkeeper.
- Header y Sidebar enlazan el nuevo tablero.

### 2026-06-02 (paridad referencia fase 2 - autocompletado)

- Rama de trabajo: `feature/auto-complete-prerequisites`.
- Se confirmo que `feature/reference-parity-plan` ya estaba mergeada en `origin/main` antes de iniciar la fase.
- Se reviso la referencia `kappas.pages.dev`: no se encontro repositorio publico asociado por dominio; el bundle publico expone componentes pero no sourcemaps ni enlace a repo.
- Se identifico `https://github.com/the-hideout/tarkov-dev` como fuente abierta relevante de `tarkov.dev`; su README enlaza tambien `the-hideout/tarkov-api` y `TarkovTracker/tarkovdata`.
- Se anadio `src/utils/taskPrerequisites.ts` para resolver cadenas reales de prerequisitos por ID/titulo contra el catalogo completo de misiones.
- Al marcar una mision desde tarjetas, detalle o arbol, ahora se marcan tambien sus prerequisitos recursivos reales, incluyendo otros comerciantes si la fuente de datos los conecta.
- Al desmarcar, se desmarca solo la mision seleccionada para no borrar progreso que el usuario pudiera haber confirmado explicitamente.

### 2026-05-17 (fase 4 achievements)

- Rama de trabajo: `feature/achievements-page`.
- Se anadio la ruta `/achievements` con cards para todos los achievements sincronizados.
- La pagina muestra rareza, estado oculto/visible, porcentaje de jugadores, seccion wiki, progreso de quests asociadas y acciones.
- Los achievements sin quests asociadas se pueden marcar manualmente usando `manualAchievementProgress` en `userProgress`.
- Los achievements con quests asociadas permiten cambiar el objetivo activo a su goal y abrir la primera quest relacionada.
- Se anadio `npm run test:achievements` para validar render basico de la pagina.

### 2026-05-17 (fase 3 selector)

- Rama de trabajo: `feature/goal-selector-filtering`.
- Se anadio `src/hooks/useGoals.ts` para cargar `goals.json`, resolver el objetivo activo desde `userProgress.selectedGoalId`, filtrar tareas y calcular progreso.
- Se cambio `src/App.tsx` para pasar tareas filtradas por objetivo a Header, Sidebar, Home, QuestListPage, QuestDetailPage y QuestTreePage.
- Se anadio selector `Objetivo` en Header para alternar entre Kappa, Lightkeeper, todas las misiones y achievements con quests asociadas.
- Se ajustaron textos del panel y del arbol para no estar acoplados solo a Kappa.

### 2026-05-17 (fase 2 progreso)

- Rama de trabajo: `feature/progress-model-goals`.
- Se anadio `UserProgress` a `src/types.ts` con `playerLevel`, `completedTaskIds`, `completedAchievementIds`, `manualAchievementProgress` y `selectedGoalId`.
- Se anadio `src/utils/progress.ts` para normalizar progreso y calcular avance por `Goal`.
- Se anadio `src/hooks/useProgress.ts`, que persiste `userProgress` y migra/sincroniza las claves antiguas `completedTasks` y `playerLevel`.
- Se migraron Header, Sidebar, Home, QuestListPage, QuestDetailPage, TaskCard y QuestTreePage para usar `useProgress` sin cambiar la UI visible.
- Se anadio `npm run test:progress` para validar normalizacion y calculo de avance por objetivo.

### 2026-05-17 (fase 1 objetivos)

- Rama de trabajo: `feature/data-goals-achievements`.
- Se amplio `src/data/tasks.json` de `257` misiones Kappa a `499` misiones totales desde `tarkov.dev`, manteniendo `countsForKappa` y anadiendo `lightkeeperRequired` y `achievementRewards`.
- Se mantuvo la UI actual filtrada a Kappa en `src/App.tsx` hasta implementar el selector de objetivos en una fase posterior.
- Se anadio `scripts/fetchAchievements.ts` y `src/data/achievements.json` con `105` achievements desde `tarkov.dev`, enriquecidos con la tabla `Achievements` de la wiki mediante API MediaWiki.
- Se anadio `scripts/buildGoals.ts` y `src/data/goals.json` con objetivos derivados: Kappa, Lightkeeper, todas las misiones y goals por achievement.
- Se regenero `src/data/questTree.json` con todas las misiones disponibles.

### 2026-05-17 (gating de progreso)

- Rama de trabajo: `feature/quest-tree-progression-gates`.
- Se anadio nivel PMC persistido en `localStorage` bajo `playerLevel` para desbloquear misiones por `levelRequirement`.
- Se actualizo `src/utils/questTree.ts` para validar completadas contra prerequisitos y nivel, evitando completar misiones adelantadas si falta la cadena previa.
- Se cambio `QuestTreePage` para ocultar nodos bloqueados hasta que sus prerequisitos y nivel esten satisfechos.
- Se anadio panel de informacion de mision seleccionada con objetivo principal, accion de marcar/desmarcar y enlace a la pagina de detalle.
- Se ampliaron pruebas de `npm run test:quests` con una cadena sintetica A -> B -> C y gating por nivel.

### 2026-05-17 (revision visual)

- Rama de trabajo: `feature/quest-tree-monster-layout`.
- Se analizo `https://eft.monster/quest-tree`: usa secciones SVG horizontales por comerciante, apiladas en una pagina global, con fondo oscuro, nodos rectangulares pequenos y enlaces tenues por color de trader.
- Se redisenio `QuestTreePage` para renderizar todos los traders a la vez en secciones con scroll horizontal, raiz visual de comerciante, nodos compactos, niveles minimos y leyenda de estados.
- Se eliminaron los controles de layout/zoom de la UI porque no existen en la referencia y hacian la vista mas compleja que el modelo original.
- Se actualizo `README.md` y `scripts/testQuestTree.tsx` para la nueva presentacion.

### 2026-05-17

- Rama de trabajo: `feature/quest-tree`.
- Se extendio `Task` y `scripts/fetchTasks.ts` con `levelRequirement` usando `minPlayerLevel` de `tarkov.dev`.
- Se regenero `src/data/tasks.json` desde `tarkov.dev` con `257` misiones Kappa y niveles minimos.
- Se anadio `src/utils/questTree.ts` y `scripts/buildQuestTree.ts` para construir arboles por comerciante desde prerequisitos.
- Se genero `src/data/questTree.json` con `npm run build:quests`.
- Se anadio la ruta `/quest-tree`, navegacion en cabecera y una vista de arbol SVG con selector de comerciante, layout cartesian/polar, orientacion, tipo de enlace, zoom y scroll.
- El arbol usa `completedTasks` para sincronizar completadas/disponibles/bloqueadas con el tracker existente.
- Se anadio `scripts/testQuestTree.tsx` y el script `npm run test:quests` para validar construccion y render basico.
- Verificacion: `npm run test:quests` correcto; `npm run build` correcto.

### 2026-05-16

- Rama de trabajo: `improve-dashboard-progress-order`.
- Se corrigio `src/hooks/useLocalStorage.ts` para sincronizar cambios de `completedTasks` entre cabecera, sidebar, panel y tarjetas sin recargar la pagina.
- Se anadio `src/utils/taskOrder.ts` para ordenar misiones por prerequisitos de la API y mantener prerequisitos antes de dependientes, con fallback estable por comerciante/titulo.
- Se mejoro el panel principal con tarjeta de progreso global, pendientes, siguiente mision recomendada y tarjetas de comerciante mas informativas.
- Se mejoro la pagina de comerciante con progreso propio y numeracion de misiones segun el orden calculado.
- Se verifico `tarkov.dev` sin regenerar datos: la API sigue exponiendo `257` misiones Kappa, igual que `src/data/tasks.json`.
- Verificacion: `npm run build` correcto.

### 2026-05-14

- Rama de trabajo: `chore/sync-kappa-tracker`.
- Se ejecuto `npm install`.
- Se anadio `bootstrap` como dependencia versionada y se elimino el CDN de Bootstrap de `index.html`.
- Se anadio `tsx` como dependencia de desarrollo.
- Se creo el script npm `update:tasks` para ejecutar `scripts/fetchTasks.ts`.
- Se actualizo `scripts/fetchTasks.ts` para consultar el esquema vigente de `tarkov.dev`, filtrar misiones `kappaRequired` y escribir metadata.
- Se regenero `src/data/tasks.json` desde `tarkov.dev` con `257` misiones Kappa.
- Se corrigio `src/App.tsx` para importar `tasks.json` dentro del bundle en lugar de usar `fetch('/src/data/tasks.json')`.
- Se anadio `src/styles.css` para mejorar layout responsivo y apariencia visual.
- Se actualizo `README.md` con flujo de sincronizacion y estructura actual.
- Verificacion: `npm run build` correcto.
- Auditoria: `npm audit --audit-level=moderate` detecto 2 vulnerabilidades moderadas en `vite/esbuild`; la correccion automatica requiere actualizacion mayor con `npm audit fix --force`, no aplicada.
- Se anadio `DESIGN.md` con el preset `kraken` mediante `npx getdesign@latest add kraken`.
- Se adapto el look and feel a Kraken: hero de progreso, header blanco, CTAs purpura, badges neutros/verdes, tarjetas con sombras suaves y estados responsivos.
