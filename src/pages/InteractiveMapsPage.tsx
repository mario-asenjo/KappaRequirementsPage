import React, { useMemo, useState } from 'react';
import mapsIndexData from '../data/maps/index.json';
import mapSourcesData from '../data/mapSources.json';
import markerLayersData from '../data/mapMarkerLayers.json';
import groundZeroMarkersData from '../data/mapMarkers/ground-zero.json';
import {
  InteractiveMapDefinition,
  InteractiveMapLayerCatalog,
  InteractiveMapSources,
  MapLayerId,
  MapMarkerDefinition,
  MapMarkerFile,
} from '../types/maps';

const mapsIndex = mapsIndexData as unknown as { maps: InteractiveMapDefinition[] } & Omit<typeof mapsIndexData, 'maps'>;
const mapSources = mapSourcesData as unknown as InteractiveMapSources;
const markerLayers = markerLayersData as unknown as InteractiveMapLayerCatalog;
const groundZeroMarkers = groundZeroMarkersData as unknown as MapMarkerFile;

const layerOrder: MapLayerId[] = ['task-objectives', 'quest-items', 'extracts', 'spawns', 'bosses', 'transits'];
const pilotMarkerFiles: Record<string, MapMarkerFile> = {
  'ground-zero': groundZeroMarkers,
};

const coverageLabels: Record<InteractiveMapDefinition['coverageStatus'], string> = {
  cataloged: 'Catalogado',
  'source-audit': 'Auditando fuentes',
  'pilot-markers': 'Piloto con marcadores',
  complete: 'Completo',
};

const markerColors: Record<MapLayerId, string> = {
  'task-objectives': '#8b7cff',
  'quest-items': '#f59e0b',
  extracts: '#35ffc8',
  spawns: '#60a5fa',
  bosses: '#f43f5e',
  transits: '#facc15',
};

const sourceById = new Map(mapSources.sources.map((source) => [source.id, source]));

const projectMarker = (marker: MapMarkerDefinition, markerFile: MapMarkerFile) => {
  const { bounds } = markerFile;
  const xRatio = (marker.geometry.x - bounds.minX) / (bounds.maxX - bounds.minX);
  const zRatio = (marker.geometry.z - bounds.minZ) / (bounds.maxZ - bounds.minZ);
  const yRatio = markerFile.projection.invertZ ? 1 - zRatio : zRatio;
  return {
    left: `${Math.max(0, Math.min(1, xRatio)) * 100}%`,
    top: `${Math.max(0, Math.min(1, yRatio)) * 100}%`,
  };
};

const countByLayer = (markers: MapMarkerDefinition[]) => markers.reduce<Record<string, number>>((acc, marker) => {
  acc[marker.layerId] = (acc[marker.layerId] ?? 0) + 1;
  return acc;
}, {});

const InteractiveMapsPage: React.FC = () => {
  const [selectedMapId, setSelectedMapId] = useState('ground-zero');
  const [activeLayerIds, setActiveLayerIds] = useState<MapLayerId[]>(['task-objectives', 'extracts', 'transits']);
  const [query, setQuery] = useState('ground');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const filteredMaps = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    if (!lowerQuery) return mapsIndex.maps;
    return mapsIndex.maps.filter((map) => (
      map.name.toLowerCase().includes(lowerQuery)
      || map.normalizedName.toLowerCase().includes(lowerQuery)
      || map.familyId.toLowerCase().includes(lowerQuery)
    ));
  }, [query]);

  const selectedMap = mapsIndex.maps.find((map) => map.id === selectedMapId)
    ?? mapsIndex.maps.find((map) => map.id === 'ground-zero')
    ?? mapsIndex.maps[0];
  const markerFile = selectedMap ? pilotMarkerFiles[selectedMap.id] : undefined;
  const layerCounts = countByLayer(markerFile?.markers ?? []);
  const visibleMarkers = (markerFile?.markers ?? []).filter((marker) => activeLayerIds.includes(marker.layerId));
  const selectedMarker = visibleMarkers.find((marker) => marker.id === selectedMarkerId) ?? visibleMarkers[0];

  const toggleLayer = (layerId: MapLayerId) => {
    setActiveLayerIds((current) => (
      current.includes(layerId)
        ? current.filter((item) => item !== layerId)
        : [...current, layerId]
    ));
    setSelectedMarkerId(null);
  };

  return (
    <div className="maps-page maps-page--pilot">
      <section className="maps-hero maps-hero--compact" aria-labelledby="maps-title">
        <div>
          <span className="eyebrow">Mapas interactivos · Ground Zero</span>
          <h1 id="maps-title">Mapa real con capas activables, no panel de promesas.</h1>
          <p>
            Ground Zero ya renderiza marcadores proyectados desde coordenadas de tarkov.dev. La Wiki se mantiene
            como fuente principal para contexto jugable y enlaces de objetivos.
          </p>
          <div className="maps-hero-badges" aria-label="Fuentes y alcance">
            <span>{visibleMarkers.length} marcadores visibles</span>
            <span>{markerFile?.markers.length ?? 0} marcadores Ground Zero</span>
            <span>{markerLayers.layers.length} capas filtrables</span>
            <span>tarkov.dev + Wiki</span>
          </div>
        </div>
      </section>

      <section className="maps-layout" aria-label="Mapa interactivo de Ground Zero">
        <aside className="maps-sidebar-panel">
          <label className="maps-search">
            <span>Buscar mapa</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ground Zero, Customs..."
            />
          </label>
          <div className="maps-list" aria-label="Mapas cubiertos">
            {filteredMaps.map((map) => (
              <button
                key={map.id}
                type="button"
                className={`map-list-button${selectedMap?.id === map.id ? ' active' : ''}`}
                onClick={() => {
                  setSelectedMapId(map.id);
                  setSelectedMarkerId(null);
                }}
                aria-pressed={selectedMap?.id === map.id}
              >
                <span>{map.name}</span>
                <small>{coverageLabels[map.coverageStatus]} · {map.markerCount} marcadores</small>
              </button>
            ))}
          </div>
        </aside>

        {selectedMap && (
          <article className="map-detail-panel map-detail-panel--pilot">
            <div className="map-detail-heading">
              <div>
                <span className="eyebrow">{coverageLabels[selectedMap.coverageStatus]}</span>
                <h2>{selectedMap.name}</h2>
                <p>
                  {markerFile
                    ? `${visibleMarkers.length} visibles de ${markerFile.markers.length} marcadores auditables · ${markerFile.coordinateSpace}`
                    : 'Este mapa aún está en cola: se mostrará aquí cuando tenga marcador/asset piloto.'}
                </p>
              </div>
              <a href={selectedMap.wikiUrl} target="_blank" rel="noreferrer" className="btn btn-outline-light btn-sm">
                Abrir wiki
              </a>
            </div>

            {markerFile ? (
              <div className="map-pilot-grid">
                <div className="map-live-shell">
                  <div className="map-layer-toolbar map-layer-toolbar--filters" aria-label="Filtros de capas">
                    {layerOrder.map((layerId) => {
                      const layer = markerLayers.layers.find((item) => item.id === layerId);
                      if (!layer) return null;
                      const active = activeLayerIds.includes(layer.id);
                      return (
                        <button
                          key={layer.id}
                          type="button"
                          className={`map-layer-chip${active ? ' active' : ''}`}
                          onClick={() => toggleLayer(layer.id)}
                          aria-pressed={active}
                        >
                          {layer.label}
                          <span>{layerCounts[layer.id] ?? 0}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="map-tactical-canvas" aria-label={`Mapa táctico de ${selectedMap.name}`}>
                    <svg className="ground-zero-map-art" viewBox="0 0 1000 650" role="img" aria-label="Mapa táctico generado de Ground Zero">
                      <defs>
                        <linearGradient id="gz-road" x1="0" x2="1">
                          <stop offset="0%" stopColor="#1f2937" />
                          <stop offset="100%" stopColor="#111827" />
                        </linearGradient>
                        <linearGradient id="gz-block" x1="0" x2="1" y1="0" y2="1">
                          <stop offset="0%" stopColor="#283044" />
                          <stop offset="100%" stopColor="#111827" />
                        </linearGradient>
                      </defs>
                      <rect width="1000" height="650" rx="28" fill="#071018" />
                      <path d="M90 110 L910 110 L910 185 L90 185 Z" fill="url(#gz-road)" opacity="0.9" />
                      <path d="M120 470 L930 470 L930 548 L120 548 Z" fill="url(#gz-road)" opacity="0.9" />
                      <path d="M435 80 L545 80 L545 585 L435 585 Z" fill="url(#gz-road)" opacity="0.82" />
                      <path d="M85 225 L370 210 L390 430 L80 425 Z" fill="url(#gz-block)" stroke="#334155" />
                      <path d="M595 205 L900 220 L890 430 L610 420 Z" fill="url(#gz-block)" stroke="#334155" />
                      <path d="M250 245 L380 260 L350 370 L230 355 Z" fill="#0f766e" opacity="0.28" stroke="#2dd4bf" />
                      <path d="M625 255 L790 245 L810 365 L645 380 Z" fill="#7c2d12" opacity="0.24" stroke="#fb923c" />
                      <line x1="60" y1="325" x2="950" y2="325" stroke="#334155" strokeDasharray="10 16" opacity="0.55" />
                      <line x1="500" y1="45" x2="500" y2="600" stroke="#334155" strokeDasharray="10 16" opacity="0.55" />
                      <text x="110" y="155" fill="#94a3b8" fontSize="24" fontWeight="700">Mira Ave / Overpass</text>
                      <text x="610" y="285" fill="#cbd5e1" fontSize="23" fontWeight="700">TerraGroup</text>
                      <text x="170" y="305" fill="#cbd5e1" fontSize="23" fontWeight="700">Emercom / Stores</text>
                      <text x="640" y="515" fill="#94a3b8" fontSize="22" fontWeight="700">Police Cordon</text>
                      <text x="38" y="612" fill="#64748b" fontSize="15">Generated tactical layer from tarkov.dev x/z coordinates · not a wiki image calibration yet</text>
                    </svg>

                    {visibleMarkers.map((marker) => {
                      const position = projectMarker(marker, markerFile);
                      const active = selectedMarker?.id === marker.id;
                      return (
                        <button
                          key={marker.id}
                          type="button"
                          className={`map-marker map-marker--${marker.layerId}${active ? ' active' : ''}`}
                          style={{ left: position.left, top: position.top, '--marker-color': markerColors[marker.layerId] } as React.CSSProperties}
                          title={marker.title}
                          aria-label={`${marker.title} · ${marker.layerId}`}
                          onClick={() => setSelectedMarkerId(marker.id)}
                        >
                          <span />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <aside className="map-marker-panel" aria-label="Marcadores visibles">
                  <div className="map-marker-panel-heading">
                    <span className="eyebrow">Marcadores</span>
                    <strong>{visibleMarkers.length}</strong>
                  </div>
                  <div className="map-marker-list">
                    {visibleMarkers.slice(0, 28).map((marker) => (
                      <button
                        key={marker.id}
                        type="button"
                        className={`map-marker-row${selectedMarker?.id === marker.id ? ' active' : ''}`}
                        onClick={() => setSelectedMarkerId(marker.id)}
                      >
                        <span style={{ background: markerColors[marker.layerId] }} />
                        <div>
                          <strong>{marker.title}</strong>
                          <small>{marker.layerId} · {marker.confidence}/{marker.precision}</small>
                        </div>
                      </button>
                    ))}
                    {visibleMarkers.length > 28 && <p className="text-muted">+ {visibleMarkers.length - 28} marcadores más en el canvas.</p>}
                  </div>

                  {selectedMarker && (
                    <div className="map-selected-marker">
                      <span className="eyebrow">Seleccionado</span>
                      <h3>{selectedMarker.title}</h3>
                      {selectedMarker.description && <p>{selectedMarker.description}</p>}
                      <dl>
                        <div><dt>Capa</dt><dd>{selectedMarker.layerId}</dd></div>
                        <div><dt>Coordenadas</dt><dd>{selectedMarker.geometry.x}, {selectedMarker.geometry.z}</dd></div>
                        <div><dt>Confianza</dt><dd>{selectedMarker.confidence} · {selectedMarker.precision}</dd></div>
                      </dl>
                      {selectedMarker.links.wikiUrl && (
                        <a href={selectedMarker.links.wikiUrl} target="_blank" rel="noreferrer">Abrir fuente wiki →</a>
                      )}
                    </div>
                  )}
                </aside>
              </div>
            ) : (
              <div className="map-empty-pilot">
                <h3>En cola de auditoría</h3>
                <p>
                  {selectedMap.name} mantiene fuentes y capas previstas, pero no se mostrará como mapa interactivo hasta
                  tener datos de coordenadas o una calibración documentada.
                </p>
              </div>
            )}
          </article>
        )}
      </section>

      <section className="maps-source-strip" aria-label="Fuentes del mapa piloto">
        <strong>Fuentes usadas en este sprint:</strong>
        <span>tarkov.dev GraphQL para coordenadas de spawns, extracts, transits y armas estacionarias.</span>
        <span>Escape from Tarkov Wiki/Fandom como fuente primaria de contexto jugable y objetivos enlazados.</span>
        <span>Sin coordenadas inventadas; la imagen es un SVG táctico generado hasta calibrar una imagen wiki/manual.</span>
      </section>
    </div>
  );
};

export default InteractiveMapsPage;
