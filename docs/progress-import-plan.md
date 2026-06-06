# Progress Import Plan

## Fase 3 - Importador web

- Definir el contrato JSON `schemaVersion: 1` para progreso detectado desde logs locales.
- Anadir ruta `/import` con carga de archivo, validacion, preview y aplicacion manual.
- Aplicar solo `completedTaskIds` reconocidos por el catalogo actual y unirlos al progreso existente.
- Reutilizar el autocompletado de prerequisitos reales al confirmar la importacion.

## Fase 4 - Extractor local CLI

- Crear `tools/eft-log-importer` como CLI Node/TypeScript de solo lectura.
- Escanear `EscapeFromTarkov/Logs/**/push-notifications_*.log`.
- Detectar `templateId` con sufijos `description`, `successMessageText` y `failMessageText`.
- Emitir `kappa-progress-import.json` con completadas, iniciadas, fallidas, raw matches, warnings e IDs no reconocidos.

## Fase 5 - Empaquetado y UX de descarga

- Documentar que el juego y launcher deben estar cerrados antes de ejecutar el extractor.
- Publicar binarios o instrucciones de ejecucion desde releases.
- Anadir en `/import` una guia corta de privacidad: solo lectura, sin credenciales, sin red.

## Fase 6 - Mejoras de confianza

- Mostrar diferencias por perfil/modo PvP/PvE si el extractor puede inferirlos.
- Permitir importar `startedTaskIds` como senal visual no completada.
- Incorporar achievements si los logs exponen eventos fiables equivalentes.
