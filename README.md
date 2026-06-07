# Kappa Progress Tracker

Este repositorio contiene una aplicación SPA escrita en **React** (con Vite y TypeScript) que ayuda a seguir el progreso de las misiones de Escape from Tarkov necesarias para obtener la caja **Kappa**. La interfaz se ha diseñado con foco en la simplicidad y la usabilidad, superando la experiencia de páginas existentes que obligan a actualizar manualmente cada misión.

## Características

- **Vista por comerciantes**: filtra las misiones por comerciante y muestra el número de misiones completadas y totales de cada uno.
- **Seguimiento persistente**: las misiones marcadas como completadas se guardan en `localStorage` para que tu progreso persista entre sesiones sin necesidad de registrarse.
- **Resumen global por objetivo**: una barra de progreso indica cuántas misiones del objetivo activo has completado y cuál es el avance total.
- **Tablero avanzado de misiones**: la ruta `/tasks` muestra todas las misiones del objetivo activo con busqueda por nombre/trader/mapa, ordenacion, agrupacion por comerciante o mapa, filtro de completadas, filtro de disponibles y filtro por nivel PMC.
- **Autocompletado de cadenas reales**: al marcar una mision como completada, tambien se marcan sus prerequisitos recursivos segun los datos de `tarkov.dev`, incluso si pertenecen a otros comerciantes.
- **Página de detalle**: cada misión tiene una página dedicada con su descripción, objetivos, prerrequisitos y recompensas.
- **Árbol de misiones**: la ruta `/quest-tree` muestra todos los comerciantes en secciones horizontales tipo eft.monster, con desbloqueo por prerequisitos y nivel PMC.
- **Selector de objetivo**: permite alternar entre Kappa, Lightkeeper, todas las misiones y achievements con quests asociadas.
- **Achievements**: la ruta `/achievements` muestra logros, rareza, progreso, objetivos asociados y checklist manual para logros sin quests.
- **Importacion de progreso**: la ruta `/import` permite cargar un JSON generado desde logs locales, previsualizar misiones detectadas y aplicar completadas reconocidas sin sobrescribir progreso existente.
- **Estado de importacion**: despues de aplicar un JSON, `/import` conserva la ultima fuente, fecha, completadas anadidas, iniciadas detectadas, warnings e IDs no reconocidos.
- **Misiones iniciadas**: las quests detectadas como iniciadas en logs se guardan y se muestran con badge propio sin contarlas como completadas.
- **Extractor descargable**: la ruta `/import` enlaza `public/downloads/eft-log-importer.zip`, con script Node.js standalone, README y runners para Windows/Linux.
- **Datos sincronizables**: `src/data/tasks.json`, `src/data/achievements.json` y `src/data/goals.json` se pueden regenerar desde `tarkov.dev` y la wiki.
- **Estilos versionados**: Bootstrap se instala como dependencia npm y se complementa con estilos locales responsivos en `src/styles.css`.
- **Sistema visual Kraken**: `DESIGN.md` documenta paleta, tipografia, radios y componentes base usados por la UI.

## Estructura del proyecto

```
kappa-tracker/
├── AGENTS.md           Reglas operativas del agente de mantenimiento
├── DESIGN.md           Sistema visual inspirado en Kraken
├── MEMORY.md           Memoria persistente de estructura, fuentes y cambios
├── .github/workflows/  CI de GitHub Actions para tests y build
├── index.html          Página HTML de entrada que carga la aplicación
├── package.json        Dependencias y scripts de npm
├── vite.config.ts      Configuración de Vite para React
├── tsconfig*.json      Configuración de TypeScript
├── public/
│   └── favicon.svg     Ícono de la aplicación
├── src/
│   ├── main.tsx        Punto de entrada de React
│   ├── App.tsx         Estructura principal con rutas y layout
│   ├── styles.css      Ajustes visuales y responsivos del layout
│   ├── types.ts        Definición de tipos para las misiones
│   ├── hooks/
│   │   ├── useLocalStorage.ts Hook base para persistir datos en localStorage
│   │   └── useProgress.ts Hook de progreso compatible con objetivos
│   ├── components/     Componentes reutilizables (Header, Sidebar, TaskCard)
│   ├── pages/          Vistas de alto nivel (Home, QuestListPage, QuestDetailPage, QuestTreePage, ProgressImportPage)
│   ├── utils/          Ordenacion y construccion del arbol de misiones
│   └── data/
│       ├── tasks.json         Base de datos de todas las misiones sincronizada desde tarkov.dev
│       ├── achievements.json  Achievements sincronizados desde tarkov.dev y wiki
│       ├── goals.json         Perfiles de progreso derivados
│       └── questTree.json     Arbol generado desde tasks.json
└── scripts/
    ├── fetchTasks.ts          Script para actualizar todas las misiones
    ├── fetchAchievements.ts   Script para actualizar achievements
    ├── buildGoals.ts          Script para generar perfiles de progreso
    ├── buildQuestTree.ts      Script para generar src/data/questTree.json
    └── testQuestTree.tsx      Pruebas basicas del arbol y renderizado
```

## Primeros pasos

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```
   Esto levantará la aplicación en `http://localhost:5173`. Cualquier cambio en los archivos `src/` recargará la página automáticamente.

3. **Construir para producción**
   ```bash
   npm run build
   ```
   El resultado se generará en el directorio `dist/`, listo para desplegarse en Cloudflare Pages o cualquier hosting estático.

## Actualizar la lista de misiones

El archivo `src/data/tasks.json` contiene todas las misiones publicadas por [tarkov.dev](https://api.tarkov.dev/graphql), incluyendo flags para Kappa y Lightkeeper. Para regenerarlo desde la API pública:

```bash
npm run update:tasks
```

Esto sobrescribe `src/data/tasks.json` con los datos más recientes e incluye metadata con la fuente, fecha de sincronización, total de misiones y totales derivados para Kappa/Lightkeeper.

Para actualizar achievements desde `tarkov.dev` y enriquecerlos con la tabla de la wiki:

```bash
npm run update:achievements
```

Para generar perfiles de progreso como Kappa, Lightkeeper, todas las misiones y achievements:

```bash
npm run build:goals
```

Después de actualizar misiones, regenera el árbol versionado:

```bash
npm run build:quests
```

El árbol se construye desde `tasks.json`, agrupa misiones por comerciante y conecta misiones cuando un prerequisito pertenece al mismo comerciante. Los prerequisitos cruzados se conservan para calcular el estado de disponibilidad.

## Tablero de misiones

La ruta `/tasks` reutiliza `QuestListPage` sin parametro de comerciante para mostrar todo el objetivo activo. Permite alternar agrupacion por comerciante/mapa, ordenar por disponibilidad, nombre o nivel, cambiar el nivel PMC persistido y mostrar solo misiones disponibles segun prerequisitos y nivel.

Las rutas `/trader/:traderName` mantienen la vista acotada al comerciante, pero comparten los mismos controles avanzados cuando aplica.

Al completar una mision desde tarjetas, detalle o arbol, el tracker resuelve la cadena completa de prerequisitos por ID/nombre contra el catalogo completo de misiones. Esto evita marcar misiones solo por orden visual y solo autocompleta relaciones reales declaradas por la fuente de datos.

## Árbol de misiones

La vista `/quest-tree` permite explorar la progresión Kappa por comerciante. Usa el mismo `localStorage` (`completedTasks`) que el tracker y persiste el nivel PMC en `localStorage` bajo `playerLevel`.

El selector `Objetivo` de la cabecera cambia el conjunto de misiones activo. Panel, sidebar, listas, detalle y árbol se recalculan con ese objetivo sin perder el progreso global almacenado en `userProgress`.

La presentación sigue el patrón de eft.monster: cada comerciante aparece como una sección independiente con un SVG horizontal, nodos compactos, nivel mínimo junto al nodo y scroll lateral para cadenas grandes. Solo se renderizan misiones desbloqueadas por prerequisitos y por el nivel PMC indicado. Selecciona un nodo para ver información rápida, marcar/desmarcar la misión o abrir su página de detalle.

Para validar la construcción del árbol y un render básico de la página:

```bash
npm run test:quests
npm run test:progress
npm run test:import
npm run test:extractor
npm run test:extractor-download
npm run test:achievements
```

El modelo de progreso nuevo se guarda en `localStorage` bajo `userProgress`, pero mantiene sincronización con las claves antiguas `completedTasks` y `playerLevel` para no perder progreso existente.

## Importar progreso desde logs

La ruta `/import` acepta archivos JSON con `schemaVersion: 1`, `source`, `generatedAt` y `completedTaskIds`. El importador valida los IDs contra `src/data/tasks.json`, muestra un preview y solo aplica completadas cuando el usuario confirma.

La importacion une el progreso detectado con el progreso local existente y autocompleta prerequisitos reales usando el catalogo completo. No borra misiones ya marcadas ni aplica IDs desconocidos.

La misma pagina incluye `Borrar todo mi progreso`, que limpia `userProgress`, `completedTasks` y `playerLevel` en este navegador. Usalo si quieres empezar de cero o si un dato legacy mantiene una quest marcada despues de desmarcarla.

El contrato y las fases de la herramienta externa estan documentados en `docs/progress-import-plan.md`.

Para generar el JSON desde logs locales en modo desarrollo:

```bash
npm run extract:logs
```

Si la autodeteccion no encuentra la instalacion, pasa la ruta explicitamente:

```bash
npm run extract:logs -- --eft "C:\\Games\\EscapeFromTarkov" --out kappa-progress-import.json
```

El extractor lee `EscapeFromTarkov/Logs/**/push-notifications_*.log`, no hace llamadas de red y no escribe dentro de la carpeta del juego. Conviene cerrar el juego y el launcher antes de ejecutarlo para evitar leer logs en escritura. Tambien puedes usar `EFT_PATH` para fijar la carpeta de instalacion.

La guia especifica del extractor vive en `tools/eft-log-importer/README.md`. Hasta publicar binarios descargables, ese documento es la referencia para ejecutar la herramienta desde el repositorio.

Los artefactos descargables de la UI (`eft-log-importer.mjs` y `eft-log-importer.zip`) se generan con:

```bash
npm run build:extractor-download
```

El enlace `Star GitHub` de la cabecera abre el repositorio para que el usuario pueda marcarlo con star desde GitHub. La accion directa requiere autenticacion en GitHub, por lo que se delega a la pagina oficial del repositorio.

## Operativa de agentes

El plan multiagente y el backlog inicial viven en `docs/agent-operating-model.md`. Ese documento define carriles de trabajo, dependencias, labels recomendadas de GitHub y la politica de verificacion antes de cerrar PRs.

## Despliegue en Cloudflare Pages

1. Conecta este repositorio a Cloudflare Pages y selecciona la rama `main` para desplegar.
2. Configura el _build command_ como `npm run build` y el _output directory_ como `dist` (debería ser el valor por defecto).
3. No es necesario configurar variables de entorno para la parte de frontend. Si añades automatización de scraping que requiera variables (por ejemplo, API keys), defínelas en el dashboard de Cloudflare.

## Nota sobre scraping y API

La fuente primaria del proyecto es `tarkov.dev`, que a su vez enlaza a la wiki de Fandom cuando existe una guía externa para la misión. Si en el futuro se necesita enriquecer descripciones o recompensas no expuestas por la API, el scraping de Fandom debería ejecutarse como paso separado y con control de errores para no bloquear el build.
