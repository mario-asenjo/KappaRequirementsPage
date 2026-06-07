# Modelo operativo de agentes para KappaTracker

Este documento convierte la vision multiagente del proyecto en un plan ejecutable dentro del repositorio actual React/Vite.

## Estado inicial verificado

- Repositorio remoto: `git@github.com:mario-asenjo/KappaRequirementsPage.git`.
- Rama base: `main`.
- Stack: React 18, Vite 4, TypeScript, React Router 6 y Bootstrap 5.
- Datos versionados:
  - `src/data/tasks.json`: 499 misiones, 257 Kappa, 102 Lightkeeper.
  - `src/data/achievements.json`: 109 achievements tras sincronizacion actual.
  - `src/data/goals.json`: 112 objetivos derivados tras sincronizacion actual.
  - `src/data/questTree.json`: 11 comerciantes, 499 misiones.
- GitHub CLI: instalado localmente; la autenticacion interactiva de `gh` queda pendiente para abrir PRs desde CLI.

## Tablero central propuesto

Mientras no haya un tablero Kanban persistente configurado para perfiles Hermes especializados, el tablero fuente de verdad sera:

1. Issues de GitHub con labels por carril.
2. Pull requests pequenos y verificables por incremento.
3. Este documento como mapa de dependencias.
4. `MEMORY.md` para decisiones y resultados de verificacion que deban quedar en el repositorio.

Labels recomendadas:

- `lane:ux-ui`
- `lane:frontend`
- `lane:backend-integration`
- `lane:data-automation`
- `lane:devops-ci`
- `lane:docs-community`
- `priority:p0`, `priority:p1`, `priority:p2`
- `status:blocked`, `status:ready`, `status:in-progress`

## Subagentes y responsabilidades

### 1. Diseno UX/UI

Objetivo: mejorar usabilidad, responsive y accesibilidad sin romper el sistema visual de `DESIGN.md`.

Skills equivalentes en Hermes:

- `popular-web-designs` para patrones visuales modernos.
- `sketch` o `claude-design` para prototipos HTML rapidos.
- `dogfood` para auditoria exploratoria de UI.

Entregables:

- Auditoria de navegacion actual: dashboard, `/tasks`, `/quest-tree`, `/import`, `/achievements`.
- Wireframes de panel de progreso, arbol de misiones e importador.
- Tokens o ajustes compatibles con `src/styles.css` y `DESIGN.md`.

### 2. Frontend

Objetivo: implementar nuevas vistas y mejoras incrementales en React/Vite.

Skills equivalentes en Hermes:

- `test-driven-development` para cambios de comportamiento.
- `requesting-code-review` para revision antes de commit.
- `systematic-debugging` cuando haya bugs de estado/localStorage.

Entregables:

- Componentes reutilizables para feedback de importacion, badges de estado y tarjetas de progreso.
- Mejoras del enrutamiento actual con React Router.
- Validaciones visibles y accesibles en importacion.
- Tests de scripts existentes o nuevos cuando se cambie comportamiento.

### 3. Backend/Integracion local

Objetivo: mantener el contrato de datos del importador local y preparar sincronizaciones futuras.

Skills equivalentes en Hermes:

- `test-driven-development` para parser y normalizadores.
- `systematic-debugging` para bugs de logs reales.

Contrato actual:

```json
{
  "schemaVersion": 1,
  "source": "eft-local-logs",
  "generatedAt": "2026-06-07T00:00:00.000Z",
  "profile": { "profileId": "optional", "mode": "optional" },
  "completedTaskIds": [],
  "startedTaskIds": [],
  "failedTaskIds": [],
  "rawMatches": [],
  "unmatchedTemplateIds": [],
  "warnings": []
}
```

Entregables:

- Parser read-only robusto para `push-notifications_*.log`.
- Compatibilidad con perfiles/modo PvP-PvE si los logs lo exponen de forma fiable.
- Validacion del JSON en frontend antes de aplicar progreso.

### 4. Scraping y automatizacion de datos

Objetivo: mantener misiones, prerequisitos y achievements actualizados.

Skills equivalentes en Hermes:

- `blogwatcher` o cron jobs de Hermes para vigilancia periodica.
- `github-pr-workflow` para abrir PRs de sincronizacion.

Entregables:

- Ejecutar `npm run update:tasks`, `npm run update:achievements`, `npm run build:goals`, `npm run build:quests`.
- Revisar diffs para distinguir cambios reales de metadata.
- Abrir PR automatico cuando haya cambios de datos.

### 5. DevOps/CI

Objetivo: asegurar despliegues seguros en Cloudflare Pages.

Skills equivalentes en Hermes:

- `github-pr-workflow` para ramas/PR/CI.
- `github-repo-management` para workflows y settings.
- `requesting-code-review` para quality gate.

Entregables:

- Workflow de GitHub Actions con instalacion limpia, tests de scripts y build.
- Avisos sobre vulnerabilidades npm sin bloquear inicialmente si no son nuevas.
- Documentar el build command de Cloudflare: `npm run build`, output `dist`.

### 6. Documentacion y comunidad

Objetivo: explicar uso del tracker, importador y arbol de misiones a usuarios y contribuidores.

Skills equivalentes en Hermes:

- `humanizer` para tono natural.
- `obsidian` solo si se decide mantener una base externa de notas.

Entregables:

- README actualizado por feature.
- FAQ de importacion de logs, privacidad y limitaciones.
- Guia de contribucion para sincronizar datos y validar PRs.

## Dependencias de trabajo

1. DevOps/CI debe ir primero: sin CI no hay red de seguridad para las demas ramas.
2. Data automation depende de corregir scripts de escritura multiplataforma.
3. UX/UI puede avanzar en paralelo con data automation.
4. Frontend debe consumir wireframes aprobados y contratos estables.
5. Documentacion acompana cada feature antes de merge.

## Primer backlog recomendado

| Prioridad | Lane | Tarea | Dependencias |
| --- | --- | --- | --- |
| P0 | DevOps/CI | Anadir GitHub Actions para tests y build | Ninguna |
| P0 | Data automation | Corregir scripts de datos en Windows/MSYS usando `fileURLToPath` | Ninguna |
| P0 | Data automation | Sincronizar achievements y goals con `tarkov.dev` | Scripts corregidos |
| P1 | UX/UI | Auditoria de `/quest-tree` e `/import` con problemas responsive/accesibilidad | CI |
| P1 | Frontend | Mejorar feedback en importacion con estados claros y aria-live | Auditoria UX |
| P1 | Backend/Integracion | Enriquecer resumen del extractor por perfil/modo si el dato es fiable | Logs reales |
| P2 | Documentacion | FAQ de importacion y troubleshooting de Node/EFT_PATH | Importador estable |

## Politica de verificacion

Antes de cerrar cualquier PR:

```bash
npm run test:quests
npm run test:progress
npm run test:import
npm run test:extractor
npm run test:extractor-download
npm run test:achievements
npm run build
```

Si se modifican fuentes de datos:

```bash
npm run update:tasks
npm run update:achievements
npm run build:goals
npm run build:quests
```

Revisar `git diff` antes de commitear para confirmar que no se versionan cambios puramente accidentales.
