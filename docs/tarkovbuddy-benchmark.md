# Benchmark de producto: TarkovBuddy

Referencia analizada: https://www.tarkovbuddy.org/
Fecha: 2026-06-07

## Lectura rapida

TarkovBuddy funciona como un workspace amplio para Escape from Tarkov: quests, Kappa, Lightkeeper, BTR, objetos de quest, hideout, storyline, mapas, rutas optimizadas y economia. El aprendizaje principal para KappaTracker es que el usuario habitual no quiere solo una checklist; quiere saber que hacer ahora, que llevar a raid, que desbloquea cada mision y que items no debe vender.

KappaTracker debe diferenciarse con una experiencia mas enfocada, local-first y sin ruido: importacion desde logs locales, progreso explicable, privacidad clara y una pantalla principal orientada a decision.

## Casos de uso observados

### Seguimiento de progreso

- Marcar misiones completadas.
- Filtrar por Kappa, Lightkeeper, BTR o todas.
- Ocultar completadas.
- Ver progreso total, por trader y por objetivo.
- Consultar wiki desde cada mision.
- Sincronizar progreso con cuenta/cloud.

### Preparacion de raid

- Ver misiones activas por mapa.
- Saber que llaves u objetos hacen falta.
- Agrupar handovers y objetivos que conviene resolver juntos.
- Usar mapas con marcadores, extracts, spawns, bosses, cultists, transits e historia.

### Objetos de quest

- Agregar todos los items pendientes.
- Trackear cantidades 0/N.
- Distinguir Found in Raid.
- Filtrar por missing, partial, complete, incomplete y FiR.
- Relacionar un item con varias misiones.

### Hideout

- Planificar estaciones por nivel.
- Aplicar defaults por edicion del juego.
- Ver dependencias entre estaciones.
- Trackear materiales necesarios.
- Elegir siguiente nivel o max level.

### Storyline

- Ver capitulos narrativos.
- Entrar a un capitulo y revisar objetivos secuenciales.
- Visualizar tareas tipo hablar con trader, sobrevivir, entregar items, encontrar zonas o eliminar enemigos.

### Arbol / dependencias

- Ver grafo de misiones Kappa.
- Cambiar direccion del grafo.
- Filtrar por trader.
- Ocultar completadas.
- Hacer zoom, pan y fit route.

### Optimizador

- Generar sweeps por mapa.
- Modos Fastest Route y Most XP Route.
- Ajustar nivel de jugador.
- Penalizar cambios de mapa, llaves faltantes y distancia.
- Priorizar desbloqueos futuros.
- Separar turn-ins y handovers.

### Economia

- Ver oportunidades de trader resets, trader vs flea, barters, crafts y venta a traders.
- Filtrar por beneficio minimo.
- Marcar favoritos y bloquear items.
- Analizar beneficio, inversion y retorno.

## Puntos fuertes de la referencia

- Cobertura funcional muy amplia.
- Concepto de workspace unificado.
- Optimizador potente y configurable.
- Mapas conectados con progreso.
- Agregacion de items muy util.
- Filtros orientados a objetivos reales del jugador.
- Progreso cuantificado constantemente.

## Puntos debiles detectados

- Interfaz muy densa para usuarios nuevos.
- Mezcla de idiomas y copy inconsistente.
- Jerarquia visual mejorable en listas largas.
- Onboarding debil: no pregunta objetivo, nivel, llaves ni estado inicial.
- Reset progress muy visible.
- Ruido externo: consent, anuncios y Twitch overlay.
- Estados de carga poco claros en economia.
- Mobile probablemente complejo por tablas, grafos y mapas.

## Diferenciales propuestos para KappaTracker

### 1. Importacion desde logs como propuesta central

La home y la navbar deben vender claramente que KappaTracker puede leer progreso local sin cuentas ni credenciales. El flujo ideal debe ser:

1. Descargar extractor.
2. Ejecutarlo localmente sobre logs de EFT.
3. Subir JSON.
4. Ver preview.
5. Aplicar completadas e iniciadas sin borrar progreso manual.

### 2. Dashboard “que hago ahora”

La pantalla principal deberia evolucionar hacia:

- Progreso del objetivo activo.
- Ultima importacion y estado de logs.
- Misiones iniciadas detectadas.
- Siguiente raid recomendada.
- Items/llaves que llevar.
- Bloqueadores hacia Collector/Kappa.

### 3. Planner de raid

Una vista futura por mapa que combine:

- Misiones activas.
- Misiones desbloqueables cercanas.
- Llaves necesarias.
- Items a llevar.
- Items a guardar.
- Handovers tras salir.

### 4. Optimizador explicable

No basta con un score. El usuario debe ver frases como:

- Recomendado porque desbloquea 4 misiones y comparte mapa con 3 objetivos.
- Pospuesto porque falta Dorm room 220 key.
- Hazlo antes de entregar X para evitar conflicto.

### 5. UI menos ruidosa y mas tactica

La referencia tiene muchas herramientas, pero mucho ruido. KappaTracker puede ser mas premium si mantiene:

- Sin ads ni embeds.
- Menos tablas cuando una checklist contextual sirva mejor.
- Estados de carga claros.
- Espanol consistente.
- Mobile-first para segundo monitor/movil durante raid.

## Backlog recomendado

### P1 - Descubrimiento y confianza

- Destacar “Importar logs” en navbar.
- Anadir panel de importacion/logs en Home.
- Mostrar ultima importacion en Home.
- Reforzar copy de privacidad: solo lectura, sin red, sin credenciales.

### P2 - Progreso accionable

- Vista “Misiones iniciadas por logs”.
- Bloqueadores hacia Kappa/Collector.
- Mejor agrupacion por mapa y trader.
- CTA de “siguiente raid”.

### P3 - Preparacion de raid

- Checklist por mapa.
- Items y llaves a llevar.
- Handovers y entregas pendientes.
- Items a conservar.

### P4 - Optimizacion avanzada

- Recomendador de ruta explicable.
- Inventario de llaves.
- Preferencias de mapas a evitar.
- Modo squad.

## Decision de producto actual

La primera iteracion debe ser pequena y verificable: hacer que la importacion por logs aparezca en la home y en la navbar como diferencial principal, sin cambiar todavia el contrato de importacion ni el extractor.
