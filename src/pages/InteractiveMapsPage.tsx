import React, { useMemo, useState } from 'react';
import mapsIndexData from '../data/maps/index.json';
import mapSourcesData from '../data/mapSources.json';
import groundZeroMarkersData from '../data/mapMarkers/ground-zero.json';
import {
  InteractiveMapDefinition,
  InteractiveMapSources,
  MapMarkerDefinition,
  MapMarkerFile,
} from '../types/maps';

const mapsIndex = mapsIndexData as unknown as { maps: InteractiveMapDefinition[] } & Omit<typeof mapsIndexData, 'maps'>;
const mapSources = mapSourcesData as unknown as InteractiveMapSources;
const groundZeroMarkers = groundZeroMarkersData as unknown as MapMarkerFile;

const mapTabOrder = ['customs', 'factory', 'ground-zero', 'interchange', 'lighthouse', 'reserve', 'shoreline', 'streets-of-tarkov', 'the-lab', 'woods'];
const pilotMarkerFiles: Record<string, MapMarkerFile> = {
  'ground-zero': groundZeroMarkers,
};

type BuddyFilterId =
  | 'quest-markers'
  | 'active-only'
  | 'show-completed'
  | 'kappa-only'
  | 'pmc-extracts'
  | 'scav-extracts'
  | 'coop-extracts'
  | 'pmc-spawns'
  | 'historia'
  | 'bosses'
  | 'cultists'
  | 'transits';

const buddyFilters: { id: BuddyFilterId; label: string }[] = [
  { id: 'quest-markers', label: 'Quest markers' },
  { id: 'active-only', label: 'Active only' },
  { id: 'show-completed', label: 'Show completed' },
  { id: 'kappa-only', label: 'Kappa only' },
  { id: 'pmc-extracts', label: 'PMC extracts' },
  { id: 'scav-extracts', label: 'Scav extracts' },
  { id: 'coop-extracts', label: 'Co-op extracts' },
  { id: 'pmc-spawns', label: 'PMC spawns' },
  { id: 'historia', label: 'Historia' },
  { id: 'bosses', label: 'Bosses' },
  { id: 'cultists', label: 'Cultists' },
  { id: 'transits', label: 'Transits' },
];


const mapNamesByFamily: Record<string, string> = {
  customs: 'Customs',
  factory: 'Factory',
  'ground-zero': 'Ground Zero',
  interchange: 'Interchange',
  lighthouse: 'Lighthouse',
  reserve: 'Reserve',
  shoreline: 'Shoreline',
  'streets-of-tarkov': 'Streets of Tarkov',
  'the-lab': 'The Lab',
  woods: 'Woods',
};

const sourceById = new Map(mapSources.sources.map((source) => [source.id, source]));

const markerColor = (marker: MapMarkerDefinition) => {
  const subtype = String(marker.meta?.tarkovBuddySubtype ?? marker.category);
  if (marker.layerId === 'extracts' && subtype.includes('pmc')) return '#35e87a';
  if (marker.layerId === 'extracts' && subtype.includes('scav')) return '#407090';
  if (marker.layerId === 'extracts' && subtype.includes('coop')) return '#4f5a7f';
  if (marker.layerId === 'spawns') return '#a6683a';
  if (marker.layerId === 'bosses') return '#ef4444';
  if (marker.layerId === 'transits') return '#9b8cff';
  return '#f28a3c';
};

const markerCode = (marker: MapMarkerDefinition, ordinal: number) => {
  if (marker.layerId === 'extracts') return 'EX';
  if (marker.layerId === 'transits') return 'ST';
  if (marker.layerId === 'spawns') return 'SP';
  if (marker.layerId === 'bosses') return 'CU';
  return String(ordinal + 1);
};

const markerMatchesFilter = (marker: MapMarkerDefinition, activeFilters: BuddyFilterId[]) => {
  const type = String(marker.meta?.tarkovBuddyType ?? '');
  const subtype = String(marker.meta?.tarkovBuddySubtype ?? '');
  if (marker.layerId === 'extracts') {
    if (subtype === 'pmc') return activeFilters.includes('pmc-extracts');
    if (subtype === 'scav') return activeFilters.includes('scav-extracts');
    if (subtype === 'coop') return activeFilters.includes('coop-extracts');
    return activeFilters.includes('pmc-extracts') || activeFilters.includes('scav-extracts') || activeFilters.includes('coop-extracts');
  }
  if (marker.layerId === 'spawns') return activeFilters.includes('pmc-spawns');
  if (type === 'cultist') return activeFilters.includes('cultists');
  if (marker.layerId === 'bosses') return activeFilters.includes('bosses');
  if (marker.layerId === 'transits') return activeFilters.includes('transits');
  if (marker.layerId === 'task-objectives') return activeFilters.includes('quest-markers');
  return true;
};

const countVisibleLayers = (markers: MapMarkerDefinition[]) => new Set(markers.map((marker) => marker.layerId)).size;
const mapTabs = mapTabOrder.map((familyId) => mapsIndex.maps.find((map) => map.familyId === familyId || map.id === familyId)).filter(Boolean) as InteractiveMapDefinition[];

const InteractiveMapsPage: React.FC = () => {
  const [selectedMapId, setSelectedMapId] = useState('ground-zero');
  const [activeFilters, setActiveFilters] = useState<BuddyFilterId[]>(['pmc-extracts', 'scav-extracts', 'coop-extracts', 'transits']);
  const [query, setQuery] = useState('');
  const [playerLevel, setPlayerLevel] = useState(1);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [lockedCoordinate, setLockedCoordinate] = useState<string | null>(null);

  const selectedMap = mapsIndex.maps.find((map) => map.id === selectedMapId)
    ?? mapsIndex.maps.find((map) => map.id === 'ground-zero')
    ?? mapsIndex.maps[0];
  const markerFile = selectedMap ? pilotMarkerFiles[selectedMap.id] : undefined;
  const allMarkers = markerFile?.markers ?? [];

  const visibleMarkers = useMemo(() => allMarkers.filter((marker) => {
    const lowerQuery = query.trim().toLowerCase();
    const matchesSearch = !lowerQuery
      || marker.title.toLowerCase().includes(lowerQuery)
      || marker.description?.toLowerCase().includes(lowerQuery);
    return matchesSearch && markerMatchesFilter(marker, activeFilters);
  }), [activeFilters, allMarkers, query]);

  const selectedMarker = visibleMarkers.find((marker) => marker.id === selectedMarkerId) ?? visibleMarkers[0];
  const questCount = allMarkers.filter((marker) => marker.layerId === 'task-objectives').length + (markerFile?.tarkovBuddy?.questMarkers.length ?? 0);
  const layerCount = countVisibleLayers(visibleMarkers);
  const completionPercent = Math.round((visibleMarkers.length / Math.max(1, allMarkers.length)) * 100);

  const toggleFilter = (filterId: BuddyFilterId) => {
    setActiveFilters((current) => (
      current.includes(filterId)
        ? current.filter((item) => item !== filterId)
        : [...current, filterId]
    ));
    setSelectedMarkerId(null);
  };

  const lockCoordinate = async (x: number, y: number) => {
    const coord = `${x.toFixed(2)}%, ${y.toFixed(2)}%`;
    setLockedCoordinate(coord);
    try {
      await navigator.clipboard?.writeText(coord);
    } catch {
      // Clipboard is best-effort in local/dev contexts.
    }
  };

  const handleMapClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
    await lockCoordinate(x, y);
  };

  const handleMapKeyDown = async (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    await lockCoordinate(50, 50);
  };

  return (
    <div className="maps-page maps-page--buddy">
      <section className="tb-map-hero" aria-labelledby="maps-title">
        <div>
          <span className="tb-kicker">Interactive map</span>
          <h1 id="maps-title">Quest, story, and extraction overview.</h1>
          <p>Track active objectives and tactical markers from a single workspace with less chrome around the map.</p>
        </div>
        <div className="tb-stat-row" aria-label="Resumen de mapa">
          <div><span>Map</span><strong>{selectedMap?.name}</strong></div>
          <div><span>Markers</span><strong>{visibleMarkers.length}</strong></div>
          <div><span>Quest</span><strong>{questCount}</strong></div>
          <div><span>Layers</span><strong>{layerCount}</strong></div>
          <div><span>Player level</span><strong>{playerLevel}</strong></div>
        </div>
      </section>

      <section className="tb-map-controls" aria-label="TarkovBuddy map controls">
        <div className="tb-map-tabs" aria-label="Mapas">
          {mapTabs.map((map) => (
            <button
              key={map.id}
              type="button"
              className={selectedMap?.id === map.id ? 'active' : ''}
              onClick={() => {
                setSelectedMapId(map.id);
                setSelectedMarkerId(null);
              }}
              aria-pressed={selectedMap?.id === map.id}
            >
              {mapNamesByFamily[map.familyId] ?? map.name}
            </button>
          ))}
        </div>

        <div className="tb-control-grid">
          <label className="tb-search">
            <span>Search quests</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by quest or marker name"
            />
          </label>
          <div className="tb-level-control" aria-label="Player level">
            <span>Player level</span>
            <strong>LV {playerLevel}</strong>
            <button type="button">Use optimizer level</button>
            <button type="button" onClick={() => setPlayerLevel((level) => Math.max(1, level - 1))}>-</button>
            <b>{completionPercent}%</b>
            <button type="button" onClick={() => setPlayerLevel((level) => Math.min(79, level + 1))}>+</button>
          </div>
        </div>

        <div className="tb-filter-row" aria-label="Filtros de marcadores">
          {buddyFilters.map((filter) => {
            const active = activeFilters.includes(filter.id);
            return (
              <button key={filter.id} type="button" className={active ? 'active' : ''} onClick={() => toggleFilter(filter.id)} aria-pressed={active}>
                {filter.label}
              </button>
            );
          })}
          <button type="button" onClick={() => setActiveFilters(['pmc-extracts', 'scav-extracts', 'coop-extracts', 'transits'])}>Reset</button>
          <button type="button" disabled>Undo</button>
        </div>
      </section>

      {markerFile ? (
        <section className="tb-map-workspace" aria-label={`Mapa interactivo de ${selectedMap.name}`}>
          <div className="tb-map-card">
            <div
              className="tb-map-stage"
              onClick={handleMapClick}
              onKeyDown={handleMapKeyDown}
              role="button"
              tabIndex={0}
              aria-label="Click anywhere on the map to lock and copy coordinates"
            >
              <img src={markerFile.tarkovBuddy?.mapImage ?? markerFile.mapArt.asset} alt={selectedMap.name} />
              {visibleMarkers.map((marker, index) => {
                const active = selectedMarker?.id === marker.id;
                return (
                  <button
                    key={marker.id}
                    type="button"
                    className={`tb-map-pin tb-map-pin--${marker.layerId}${active ? ' active' : ''}`}
                    style={{ left: `${marker.geometry.x}%`, top: `${marker.geometry.z}%`, '--pin-color': markerColor(marker) } as React.CSSProperties}
                    title={marker.title}
                    aria-label={`${markerCode(marker, index)} ${marker.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedMarkerId(marker.id);
                    }}
                  >
                    {markerCode(marker, index)}
                  </button>
                );
              })}
              <div className="tb-coordinate-lock">
                {lockedCoordinate ? `Locked: ${lockedCoordinate}` : 'Click anywhere on the map to lock and copy coordinates.'}
              </div>
            </div>
          </div>

          <aside className="tb-marker-drawer" aria-label="Visible markers">
            <p>Visible markers</p>
            <h2>{selectedMap.name}</h2>
            <span>Filtered quest, storyline, and utility markers for the current map.</span>
            <div className="tb-marker-badges">
              <b>{visibleMarkers.length}</b>
              <em>Quest</em>
              <em>PMC</em>
              <em>Scav</em>
              <em>Co-op extracts</em>
              <em>Historia</em>
              <em>Bosses</em>
              <em>Transits</em>
            </div>
            <div className="tb-marker-list">
              {visibleMarkers.map((marker, index) => (
                <button
                  key={marker.id}
                  type="button"
                  className={selectedMarker?.id === marker.id ? 'active' : ''}
                  onClick={() => setSelectedMarkerId(marker.id)}
                >
                  <span>{markerCode(marker, index)}</span>
                  <div>
                    <strong>{marker.title}</strong>
                    {marker.description && <small>{marker.description}</small>}
                    <small>{marker.geometry.x.toFixed(2)}%, {marker.geometry.z.toFixed(2)}%</small>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </section>
      ) : (
        <section className="tb-map-workspace tb-map-workspace--empty">
          <h2>{selectedMap.name}</h2>
          <p>Mapa en cola. La visualización completa se activará cuando tengamos imagen, contrato y marcadores auditados.</p>
        </section>
      )}

      <section className="maps-source-strip" aria-label="Fuentes del mapa piloto">
        <strong>Fuentes usadas:</strong>
        <span>
          TarkovBuddy como referencia de contrato visual y mapa Ground Zero: imagen local + marcadores x/y porcentuales ·{' '}
          <a href="https://www.tarkovbuddy.org/maps" target="_blank" rel="noreferrer">fuente de referencia</a>.
        </span>
        <span>Escape from Tarkov Wiki/Fandom y tarkov.dev se mantienen como fuentes primarias de contexto jugable.</span>
        <span>{sourceById.get('tarkovbuddy-map-bundle')?.notes}</span>
      </section>
    </div>
  );
};

export default InteractiveMapsPage;
