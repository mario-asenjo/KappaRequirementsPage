---
title: Fase 3 - Importador web v2: previsualizar y aplicar por perfil
labels: priority/p1,type/feature,type/ux,area/import-logs,area/frontend
---
## Objetivo
Que `/import` entienda `schemaVersion: 2`, muestre cada perfil detectado y aplique solo al perfil elegido.

## Alcance minimo
- Lista de perfiles detectados con modo, rango de versiones, numero de sesiones y conteos.
- Seleccion de perfil destino (existente o nuevo); PvE preseleccionado.
- Desconocidos agrupados por clasificacion con explicacion.
- Aviso si el import trae sesiones anteriores al ultimo prestige del perfil.
- Compatibilidad v1 (aplica al perfil activo con aviso).

## Criterios de aceptacion
- [ ] Imposible aplicar eventos PvP a un perfil PvE sin confirmacion explicita.
- [ ] `lastImport` guardado por perfil.
- [ ] `test:import` cubre v1 y v2.
