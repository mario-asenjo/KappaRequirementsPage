import React, { useMemo, useState } from 'react';
import mapsIndexData from '../data/maps/index.json';
import mapSourcesData from '../data/mapSources.json';
import markerLayersData from '../data/mapMarkerLayers.json';
import { InteractiveMapDefinition, InteractiveMapLayerCatalog, InteractiveMapSources, MapLayerId } from '../types/maps';

const mapsIndex = mapsIndexData as unknown as { maps: InteractiveMapDefinition[] } & Omit<typeof mapsIndexData, 'maps'>;
const mapSources = mapSourcesData as unknown as InteractiveMapSources;
const markerLayers = markerLayersData as unknown as InteractiveMapLayerCatalog;

const layerOrder: MapLayerId[] = ['task-objectives', 'quest-items', 'extracts', 'spawns', 'bosses', 'transits'];

const coverageLabels: Record<InteractiveMapDefinition['coverageStatus'], string> = {
  cataloged: 'Catalogado',
  'source-audit': 'Auditando fuentes',
  'pilot-markers': 'Piloto con marcadores',
  complete: 'Completo',
};

const sourceById = new Map(mapSources.sources.map((source) => [source.id, source]));

const InteractiveMapsPage: React.FC = () => {
  const [selectedMapId, setSelectedMapId] = useState(mapsIndex.maps[0]?.id ?? '');
  const [activeLayer, setActiveLayer] = useState<MapLayerId>('task-objectives');
  const [query, setQuery] = useState('');

  const filteredMaps = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    if (!lowerQuery) return mapsIndex.maps;
    return mapsIndex.maps.filter((map) => (
      map.name.toLowerCase().includes(lowerQuery)
      || map.normalizedName.toLowerCase().includes(lowerQuery)
      || map.familyId.toLowerCase().includes(lowerQuery)
    ));
  }, [query]);

  const selectedMap = mapsIndex.maps.find((map) => map.id === selectedMapId) ?? mapsIndex.maps[0];
  const selectedLayer = markerLayers.layers.find((layer) => layer.id === activeLayer) ?? markerLayers.layers[0];
  const primaryMaps = mapsIndex.maps.filter((map) => map.familyId === map.id || map.id === 'the-lab').length;

  return (
    <div className="maps-page">
      <section className="maps-hero" aria-labelledby="maps-title">
        <div>
          <span className="eyebrow">Mapas interactivos</span>
          <h1 id="maps-title">Base auditada para el mejor recurso de mapas de Tarkov.</h1>
          <p>
            Cubrimos todos los mapas devueltos por tarkov.dev y arrancamos sin inventar coordenadas:
            cada marcador futuro tendrá fuente, fecha, confianza y precision declaradas.
          </p>
          <div className="maps-hero-badges" aria-label="Fuentes y alcance">
            <span>{mapsIndex.maps.length} variantes catalogadas</span>
            <span>{primaryMaps} familias jugables</span>
            <span>{markerLayers.layers.length} capas previstas</span>
            <span>Wiki + tarkov.dev</span>
          </div>
        </div>
        <aside className="maps-source-card" aria-labelledby="maps-source-title">
          <span className="eyebrow">Politica de fuentes</span>
          <h2 id="maps-source-title">Sí: wiki como fuente principal.</h2>
          <p>
            La Escape from Tarkov Wiki queda como referencia primaria para ubicaciones jugables y
            tarkov.dev como catálogo canónico de IDs/nombres. Las coordenadas exactas requerirán
            auditoría manual o transformación documentada antes de mostrarse como precisas.
          </p>
        </aside>
      </section>

      <section className="maps-layout" aria-label="Explorador inicial de mapas">
        <aside className="maps-sidebar-panel">
          <label className="maps-search">
            <span>Buscar mapa</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Customs, Ground Zero..."
            />
          </label>
          <div className="maps-list" role="listbox" aria-label="Mapas cubiertos">
            {filteredMaps.map((map) => (
              <button
                key={map.id}
                type="button"
                className={`map-list-button${selectedMap?.id === map.id ? ' active' : ''}`}
                onClick={() => setSelectedMapId(map.id)}
                role="option"
                aria-selected={selectedMap?.id === map.id}
              >
                <span>{map.name}</span>
                <small>{coverageLabels[map.coverageStatus]} · {map.plannedLayers.length} capas</small>
              </button>
            ))}
          </div>
        </aside>

        {selectedMap && (
          <article className="map-detail-panel">
            <div className="map-detail-heading">
              <div>
                <span className="eyebrow">{coverageLabels[selectedMap.coverageStatus]}</span>
                <h2>{selectedMap.name}</h2>
                <p>
                  Familia: <strong>{selectedMap.familyId}</strong> · normalizedName:{' '}
                  <code>{selectedMap.normalizedName}</code>
                </p>
              </div>
              <a href={selectedMap.wikiUrl} target="_blank" rel="noreferrer" className="btn btn-outline-light btn-sm">
                Abrir wiki
              </a>
            </div>

            <div className="map-canvas-placeholder" aria-label={`Lienzo previsto para ${selectedMap.name}`}>
              <div className="map-grid-glow" />
              <div className="map-canvas-content">
                <span className="map-pin-preview">◎</span>
                <h3>{selectedLayer.label}</h3>
                <p>{selectedLayer.description}</p>
                <small>
                  Marcadores actuales: {selectedMap.markerCount}. La capa se activará cuando sus coordenadas tengan fuente auditada.
                </small>
              </div>
            </div>

            <div className="map-layer-toolbar" aria-label="Capas previstas">
              {layerOrder.map((layerId) => {
                const layer = markerLayers.layers.find((item) => item.id === layerId);
                if (!layer) return null;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    className={`map-layer-chip${activeLayer === layer.id ? ' active' : ''}`}
                    onClick={() => setActiveLayer(layer.id)}
                  >
                    {layer.label}
                  </button>
                );
              })}
            </div>

            <div className="map-detail-grid">
              <div className="map-info-card">
                <h3>Qué cubriremos</h3>
                <ul>
                  {markerLayers.layers.map((layer) => (
                    <li key={layer.id}><strong>{layer.label}:</strong> {layer.description}</li>
                  ))}
                </ul>
              </div>
              <div className="map-info-card">
                <h3>Fuentes de este mapa</h3>
                <ul className="map-source-list">
                  {selectedMap.sourceIds.map((sourceId) => {
                    const source = sourceById.get(sourceId);
                    return source ? (
                      <li key={source.id}>
                        <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                        <span>{source.role}</span>
                      </li>
                    ) : null;
                  })}
                </ul>
                <p className="map-source-policy">{selectedMap.sourcePolicy}</p>
              </div>
            </div>
          </article>
        )}
      </section>

      <section className="maps-roadmap-panel" aria-labelledby="maps-roadmap-title">
        <span className="eyebrow">Plan de cobertura</span>
        <h2 id="maps-roadmap-title">Orden de ataque</h2>
        <div className="maps-roadmap-grid">
          <div>
            <strong>1. Catálogo y fuentes</strong>
            <p>Todos los mapas, variantes, links wiki y capas previstas quedan visibles desde /maps.</p>
          </div>
          <div>
            <strong>2. Primer mapa piloto</strong>
            <p>Customs o Ground Zero con objetivos de quests y extracts de alta confianza.</p>
          </div>
          <div>
            <strong>3. Marcadores enlazados</strong>
            <p>taskIds/objectiveIds/itemIds para filtrar por tu progreso y planificar raids.</p>
          </div>
          <div>
            <strong>4. Precisión escalonada</strong>
            <p>Map-only → zona → coordenada exacta, siempre mostrando fuente y confianza.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InteractiveMapsPage;
