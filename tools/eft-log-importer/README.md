# EFT Log Importer

Herramienta local de solo lectura para generar un JSON importable por la ruta `/import` de Kappa Progress Tracker.

## Requisitos

- Node.js 18 o superior.
- Dependencias instaladas con `npm install`.
- Escape from Tarkov y Battlestate Launcher cerrados antes de leer logs.

## Uso Rapido

El extractor puede intentar detectar la instalacion automaticamente:

```bash
npm run extract:logs
```

Si no encuentra la carpeta, indica la ruta exacta de `EscapeFromTarkov`:

```bash
npm run extract:logs -- --eft "C:\\Games\\EscapeFromTarkov" --out kappa-progress-import.json
```

En WSL, usa la ruta montada de Windows:

```bash
npm run extract:logs -- --eft "/mnt/c/Users/<usuario>/Desktop/EFTINSTALLFOLDER/EscapeFromTarkov" --out kappa-progress-import.json
```

Tambien puedes definir la variable de entorno `EFT_PATH`:

```bash
EFT_PATH="/mnt/c/Users/<usuario>/Desktop/EFTINSTALLFOLDER/EscapeFromTarkov" npm run extract:logs
```

## Despues De Generar El JSON

1. Abre la web.
2. Ve a `/import`.
3. Selecciona `kappa-progress-import.json`.
4. Revisa completadas nuevas, iniciadas detectadas e IDs no reconocidos.
5. Pulsa `Aplicar completadas detectadas` si el preview es correcto.

## Que Lee

- `EscapeFromTarkov/Logs/**/push-notifications_*.log`
- `templateId` con sufijo `description`, `successMessageText` o `failMessageText`
- `profileid` cuando aparece en notificaciones de matchmaking

## Que Escribe

- Solo el archivo indicado con `--out`.
- No escribe dentro de la carpeta del juego salvo que el usuario elija explicitamente esa ruta como salida.

## Privacidad

- No recoge credenciales.
- No hace llamadas de red.
- No modifica archivos de Escape from Tarkov.
- Conviene cerrar juego y launcher antes de ejecutarlo para evitar leer logs mientras se estan escribiendo.

## Limitaciones

- Los logs locales pueden estar incompletos o rotados.
- El resultado no es una foto completa del perfil, solo eventos detectados en logs existentes.
- Las misiones completadas antes del rango de logs disponible pueden faltar.

## Solucion De Problemas

- `No readable EscapeFromTarkov/Logs folder was found`: pasa `--eft` con la carpeta que contiene `Logs`.
- `Completed quests: 0`: puede que no haya eventos `successMessageText` en los logs conservados.
- IDs no reconocidos: pueden ser mensajes de sistema, datos nuevos que no estan en `tasks.json` o quests fuera del catalogo actual.
- Si usas PowerShell, conserva las comillas alrededor de rutas con espacios.
