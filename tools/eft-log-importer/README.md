# EFT Log Importer

Herramienta local de solo lectura para generar un JSON importable por la ruta `/import` de Kappa Progress Tracker.

## Uso en desarrollo

```bash
npm run extract:logs -- --eft "C:\\Games\\EscapeFromTarkov" --out kappa-progress-import.json
```

En WSL, usa la ruta montada de Windows:

```bash
npm run extract:logs -- --eft "/mnt/c/Users/<usuario>/Desktop/EFTINSTALLFOLDER/EscapeFromTarkov" --out kappa-progress-import.json
```

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
