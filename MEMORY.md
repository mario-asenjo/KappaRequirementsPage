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
- `src/data/tasks.json`: datos versionados de misiones Kappa.
- `src/data/questTree.json`: arbol de misiones generado desde `tasks.json`.
- `src/utils/questTree.ts`: construccion de arbol por comerciante y estados de nodos.
- `src/styles.css`: ajustes visuales y responsivos locales.
- `DESIGN.md`: sistema visual inspirado en Kraken para guiar cualquier cambio de interfaz.
- `scripts/fetchTasks.ts`: sincronizacion de misiones desde `tarkov.dev`.

## Convenciones

- Componentes React en PascalCase.
- Tipos compartidos en `src/types.ts`.
- Estilos base con Bootstrap y ajustes propios en `src/styles.css`.
- Look and feel basado en `DESIGN.md`: superficies blancas, texto near-black, acentos `#7132f5`, botones de 12px y sombras suaves.
- Progreso del usuario persistido solo en `localStorage` bajo `completedTasks`.
- Las misiones se importan desde `src/data/tasks.json` para quedar incluidas en el bundle de produccion.
- El arbol se puede regenerar con `npm run build:quests`; las pruebas basicas se ejecutan con `npm run test:quests`.

## Fuentes Oficiales De Misiones

- Fuente primaria actual: `https://api.tarkov.dev/graphql`.
- Fuente secundaria para guias externas: `https://escapefromtarkov.fandom.com` enlazada por `wikiLink` cuando la API la expone.
- Ultima sincronizacion registrada: `2026-05-14T14:33:15.426Z`.
- Total registrado de misiones Kappa: `257`.

## Historial De Cambios

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
