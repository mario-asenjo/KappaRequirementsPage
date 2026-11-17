# Matriz de senales de logs de EFT (certificada)

Issue: #66 · Fecha: 2026-11-17 · Muestra: 7 sesiones `1.3.0.2.48779` (2026-11-14 a 2026-11-17), 6 con contenido. Las sesiones < 1.2.0 se excluyen.
Herramienta: `npm run survey:logs -- --eft <EscapeFromTarkov> [--since 1.2.0.0]` (solo lectura, salida redactada).

## Ficheros por sesion

`Logs/log_<YYYY.MM.DD_H-MM-SS>_<version>/<YYYY.MM.DD_H-MM-SS>_<version> <canal>_000.log`

Canales presentes: `application`, `backend`, `errors`, `files-checker`, `network-connection`, `network-messages`, `output`, `push-notifications`, `spatial-audio`, a veces `insurance`, `aiData`, `aiErrors`, `maperrors`, `objectPool`. El nombre del fichero lleva un prefijo con espacio: hay que usar el ultimo token del nombre para identificar el canal.

Formato de linea: `YYYY-MM-DD HH:MM:SS.mmm|<version>|<Nivel>|<canal>|<mensaje>`; los JSON multilinea van debajo de su cabecera.

## Senales

| Dato | Fuente | Patron | Fiabilidad | Notas |
| --- | --- | --- | --- | --- |
| Version de cliente | nombre de carpeta | `log_..._<a.b.c.d>.<build>` | alta | Tambien en cada linea. |
| Perfil activo | `application` | `CompleteSelectedProfile ProfileId:<24hex> AccountId:<n>` | alta | Varias por sesion (cada vuelta al menu). `AccountId` no se guarda nunca. |
| Modo del perfil | `backend` | host `gw-pve` / `gw-pvp` / `gw-pvp-season` `.escapefromtarkov.com` | alta | Modo = host mayoritario mientras el perfil esta activo. Antes del primer `CompleteSelectedProfile` hay trafico de ambos hosts (login): ignorar. |
| Modo (debil) | `push-notifications` | `onlinePveRaidStates` | media | Solo en algunas sesiones PvE; ausencia no implica PvP. |
| Modo (inutil) | `application`/`output` | `GameMode: deathmatch`, `"mode": "deathmatch"`, `"raidMode": "Online"` | ninguna | Aparecen igual en PvE. |
| Evento de quest | `push-notifications` | `"type": 10|11|12` + `"templateId": "<taskId> description|failMessageText|successMessageText"` | alta | 10 iniciada, 11 fallida, 12 completada. `text` siempre "quest started". |
| Evento de quest (duplicado) | `output` | mismo bloque | - | 100% duplicado de `push-notifications` en la muestra: no leer. |
| Timestamp del evento | cabecera del bloque | `Got notification | ChatMessageReceived` | alta | Necesario para atribuir perfil. |
| Nivel, faccion, prestige, edicion | `push-notifications` | `onlinePveRaidStates...extendedProfile.Info.{Level,Side,PrestigeLevel,GameVersion}` | media | Solo PvE y solo al entrar en raid. Incluye miembros de grupo: filtrar por perfil propio. |
| Mapas desbloqueados | idem | `unlockedLocations[]` | media | |

## Resultado de la muestra (redactado)

| Sesion | Perfil (hash) | Modo | Eventos |
| --- | --- | --- | --- |
| 11-14 22:42 | `e3277b1f` | PvE | 9 iniciadas + 2 desconocidas iniciadas, 2 completadas (The Courier, Chemical - Part 4), 2 fallidas (Big Customer, Out of Curiosity) |
| 11-15 14:02 | `e3277b1f` | PvE | 5 iniciadas, 3 completadas (Black Swan, Balancing - Part 2 [PVE ZONE], Surprise [PVE ZONE]) |
| 11-15 15:44 | `e3277b1f` | PvE | Wet Job - Part 3 completada, Part 4 iniciada |
| 11-16 00:52 | `e3a79fa2` | **PvP** | Semiconductor Crisis y Fuel Crisis completadas |
| 11-16 13:46 | `e3277b1f` | PvE (empieza en PvP sin seleccionar perfil) | sin eventos |
| 11-16 23:00 | `e3277b1f` | PvE | 4 completadas (Anesthesia, Health Care Privacy - Part 1, Needle in a Haystack, Dressed to Kill), 2 iniciadas |

Perfil -> host: `e3277b1f` 4818 `gw-pve` / 0 `gw-pvp`; `e3a79fa2` 276 `gw-pvp` / 0 `gw-pve`.

Instantanea PvE: nivel 15 -> 16, USEC, prestige 0, edicion `unheard_edition`.

## IDs sin resolver

- `6a763df2161e4b45b1015663` (ObjectId 2026-08-07) - iniciada en PvE.
- `6aba40a15ef26da1360746b8` (ObjectId 2026-09-28) - iniciada en PvE.

Ninguno esta en `json.tarkov.dev` `/pve` ni `/regular` (2026-11-17). Clasificar `unresolved`.

## Pendiente

- Sesion post Unity 6 (1.3.5.0): repetir el survey y comparar nombres de canal, formato de linea y patrones.
- Sesion Seasonal PvP para confirmar `gw-pvp-season`.
