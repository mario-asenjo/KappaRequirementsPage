# KappaTracker Design Direction

Este documento sustituye la direccion anterior inspirada en Kraken. La UI no debe sentirse como una landing de crypto; debe sentirse como una herramienta tactica para jugadores de Escape from Tarkov: oscura, clara, densa cuando aporte valor y siempre orientada a la siguiente decision del jugador.

## 1. Principios de producto

1. Import-first: la importacion desde logs locales es el diferencial de KappaTracker y debe aparecer en la home, navbar y onboarding.
2. Local-first: no pedir cuenta ni credenciales para funcionalidades core. Explicar siempre que el extractor es de solo lectura y sin llamadas de red.
3. Decision over checklist: no solo listar misiones; responder “que hago ahora”, “que llevo” y “que me bloquea”.
4. Menos ruido que la competencia: sin ads, sin embeds, sin popups innecesarios.
5. Mobile/second-monitor friendly: checklists grandes, estados claros y acciones rapidas.
6. Progreso explicable: cada recomendacion futura debe decir por que se prioriza o se bloquea.

## 2. Atmosfera visual

Inspiracion: dashboards oscuros tipo Linear/Sentry, con lectura tactica y acentos violeta/verde. No copiar TarkovBuddy: usar su cobertura funcional como benchmark, no su densidad visual.

- Fondo principal: dark-first, casi negro, con paneles ligeramente elevados.
- Superficies: cards con bordes sutiles, sin sombras pesadas.
- Acento primario: violeta/indigo para CTAs y foco.
- Acento de exito: verde para completado/importado/seguro.
- Acento de aviso: ambar para bloqueadores, llaves faltantes o warnings.
- Tipografia: Inter o system-ui; pesos medios, titulares compactos.

## 3. Paleta propuesta

### Fondos

- `--surface-page`: #080a0f
- `--surface-shell`: #0d1118
- `--surface-panel`: #141925
- `--surface-elevated`: #1b2230

### Texto

- `--text-primary`: #f5f7fb
- `--text-secondary`: #c7cedb
- `--text-muted`: #8d96a8
- `--text-disabled`: #5f6878

### Acentos

- `--accent-primary`: #7c5cff
- `--accent-primary-hover`: #9b87ff
- `--accent-success`: #2fd17c
- `--accent-warning`: #f4b942
- `--accent-danger`: #ff5f6d

### Bordes

- `--border-subtle`: rgba(255,255,255,0.07)
- `--border-strong`: rgba(255,255,255,0.14)

## 4. Componentes clave

### Navbar

- Debe mantener acceso a Panel, Misiones, Arbol, Achievements e Importar logs.
- “Importar logs” se considera accion destacada, no un link secundario.
- En mobile debe mantener touch targets amplios y poder envolver sin romper la lectura.

### Home / Mission Control

La home no debe ser solo resumen por comerciante. Debe evolucionar hacia:

1. Progreso del objetivo activo.
2. Panel de importacion de logs.
3. Ultima importacion y misiones iniciadas detectadas.
4. Siguiente accion recomendada.
5. Resumen por trader o mapa.

### Importacion

El panel de importacion debe ser el flujo con mayor confianza del producto:

- CTA principal: Descargar extractor ZIP.
- Explicacion clara: solo lectura, sin credenciales, sin red.
- Pasos cortos: descargar, ejecutar, subir JSON, previsualizar, aplicar.
- Estados visibles: primera vez, ultima importacion, warnings, IDs desconocidos.

### Cards de mision

- Mostrar estado: bloqueada, disponible, iniciada por logs, completada.
- Mostrar trader, mapa, nivel y prerequisitos cuando existan.
- La accion principal debe ser clara: ver detalle, marcar completada o continuar.

### Arbol de misiones

- Priorizar legibilidad antes que espectacularidad.
- Mostrar blockers y camino critico hacia Kappa/Collector.
- Permitir filtros por trader, mapa y estado.
- Explicar por que un nodo esta bloqueado.

## 5. UX copy

Tono: directo, jugador a jugador, sin marketing vacio.

Buenos ejemplos:

- “Importa tu progreso real desde los logs locales.”
- “Sin cuentas, sin credenciales, sin llamadas de red.”
- “Detectamos estas misiones iniciadas, pero aun no completadas.”
- “Bloqueada por nivel PMC o prerequisitos.”
- “Siguiente raid recomendada: Customs.”

Evitar:

- Claims genericos tipo “la mejor herramienta”.
- Copy ambiguo como “automatizacion avanzada” sin explicar.
- Mezcla innecesaria de idiomas en labels de UI.

## 6. Accesibilidad y responsive

- Contraste AA minimo para texto normal.
- Botones y links con foco visible.
- No depender solo del color para estados de mision.
- Touch targets de al menos 44px en mobile.
- Tablas largas deben tener alternativa en cards.
- Grafos/mapas deben tener lista textual equivalente.

## 7. Roadmap visual

### Fase 1 - Incremental

- Destacar Importar logs en navbar.
- Anadir panel de importacion/logs en Home.
- Documentar benchmark y nueva direccion visual.

### Fase 2 - Home tactica

- Redisenar Home como Mission Control real.
- Mostrar ultima importacion, iniciadas, bloqueadores y siguiente accion.
- Reducir dependencia de tarjetas por trader como unica vista inicial.

### Fase 3 - Redesign dark-first

- Migrar variables CSS a paleta tactica oscura.
- Revisar Header, Sidebar, Home, QuestList, QuestTree e Import.
- Validar accesibilidad, mobile y build en cada PR.

### Fase 4 - Planner

- Vista por raid/mapa.
- Items/llaves a llevar.
- Handovers post-raid.
- Recomendaciones explicables.
