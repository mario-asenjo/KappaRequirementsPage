import React, { useMemo, useRef, useState } from 'react';
import mapsIndexData from '../data/maps/index.json';
import mapSourcesData from '../data/mapSources.json';
import customsMarkersData from '../data/mapMarkers/customs.json';
import groundZeroMarkersData from '../data/mapMarkers/ground-zero.json';
import {
  InteractiveMapDefinition,
  InteractiveMapSources,
  MapMarkerDefinition,
  MapMarkerFile,
} from '../types/maps';

const mapsIndex = mapsIndexData as unknown as { maps: InteractiveMapDefinition[] } & Omit<typeof mapsIndexData, 'maps'>;
const mapSources = mapSourcesData as unknown as InteractiveMapSources;
const customsMarkers = customsMarkersData as unknown as MapMarkerFile;
const groundZeroMarkers = groundZeroMarkersData as unknown as MapMarkerFile;

const mapTabOrder = ['customs', 'factory', 'ground-zero', 'interchange', 'lighthouse', 'reserve', 'shoreline', 'streets-of-tarkov', 'the-lab', 'woods'];
const pilotMarkerFiles: Record<string, MapMarkerFile> = {
  customs: customsMarkers,
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
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  if (marker.layerId === 'bosses') return 'BO';
  return String(ordinal + 1);
};

const markerKindLabel = (marker: MapMarkerDefinition) => {
  if (marker.layerId === 'extracts') return `${String(marker.meta?.tarkovBuddySubtype ?? marker.category).toUpperCase()} extraction`;
  if (marker.layerId === 'task-objectives') return 'Quest marker';
  if (marker.layerId === 'spawns') return 'Spawn point';
  if (marker.layerId === 'bosses') return String(marker.meta?.tarkovBuddyType ?? 'Boss marker');
  if (marker.layerId === 'transits') return 'Transit';
  return marker.category;
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
  const [selectedMapId, setSelectedMapId] = useState('customs');
  const [activeFilters, setActiveFilters] = useState<BuddyFilterId[]>(['quest-markers', 'pmc-extracts', 'scav-extracts', 'coop-extracts', 'transits']);
  const [query, setQuery] = useState('');
  const [playerLevel, setPlayerLevel] = useState(1);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [lockedCoordinate, setLockedCoordinate] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.25);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const suppressNextClickRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const mapTransformRef = useRef<HTMLDivElement | null>(null);

  const selectedMap = mapsIndex.maps.find((map) => map.id === selectedMapId)
    ?? mapsIndex.maps.find((map) => map.id === 'customs')
    ?? mapsIndex.maps.find((map) => map.id === 'ground-zero')
    ?? mapsIndex.maps[0];
  const markerFile = selectedMap ? pilotMarkerFiles[selectedMap.id] : undefined;
  const allMarkers = markerFile?.markers ?? [];

  const visibleMarkers = useMemo(() => allMarkers.filter((marker) => {
    const lowerQuery = query.trim().toLowerCase();
    const matchesSearch = !lowerQuery
      || marker.title.toLowerCase().includes(lowerQuery)
      || marker.description?.toLowerCase().includes(lowerQuery)
      || markerKindLabel(marker).toLowerCase().includes(lowerQuery);
    return matchesSearch && markerMatchesFilter(marker, activeFilters);
  }), [activeFilters, allMarkers, query]);

  const selectedMarker = selectedMarkerId ? visibleMarkers.find((marker) => marker.id === selectedMarkerId) ?? null : null;
  const questCount = allMarkers.filter((marker) => marker.layerId === 'task-objectives').length;
  const layerCount = countVisibleLayers(visibleMarkers);
  const completionPercent = Math.round((visibleMarkers.length / Math.max(1, allMarkers.length)) * 100);

  const resetViewport = () => {
    setZoom(1.25);
    setPan({ x: 0, y: 0 });
  };

  const updateZoom = (nextZoom: number) => setZoom(clamp(Number(nextZoom.toFixed(2)), 1, 4));

  const focusMarker = (marker: MapMarkerDefinition) => {
    setSelectedMarkerId(marker.id);
    const viewportRect = viewportRef.current?.getBoundingClientRect();
    const mapRect = mapTransformRef.current?.getBoundingClientRect();
    if (!viewportRect || !mapRect) return;
    const markerScreenX = mapRect.left + (marker.geometry.x / 100) * mapRect.width;
    const markerScreenY = mapRect.top + (marker.geometry.z / 100) * mapRect.height;
    const targetScreenX = viewportRect.left + viewportRect.width / 2;
    const targetScreenY = viewportRect.top + viewportRect.height / 2;
    setPan((current) => ({
      x: current.x + targetScreenX - markerScreenX,
      y: current.y + targetScreenY - markerScreenY,
    }));
  };

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
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('.mg-map-marker')) return;
    const bounds = mapTransformRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100);
    const y = clamp(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100);
    await lockCoordinate(x, y);
  };

  const handleMapKeyDown = async (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 70 : 28;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setPan((current) => ({ ...current, y: current.y + step }));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setPan((current) => ({ ...current, y: current.y - step }));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setPan((current) => ({ ...current, x: current.x + step }));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setPan((current) => ({ ...current, x: current.x - step }));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      updateZoom(zoom + 0.25);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      updateZoom(zoom - 0.25);
    } else if (event.key === '0') {
      event.preventDefault();
      resetViewport();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const viewportRect = viewportRef.current?.getBoundingClientRect();
      const mapRect = mapTransformRef.current?.getBoundingClientRect();
      if (!viewportRect || !mapRect) return;
      const centerX = viewportRect.left + viewportRect.width / 2;
      const centerY = viewportRect.top + viewportRect.height / 2;
      await lockCoordinate(
        clamp(((centerX - mapRect.left) / mapRect.width) * 100, 0, 100),
        clamp(((centerY - mapRect.top) / mapRect.height) * 100, 0, 100),
      );
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (event.button !== 0 || target.closest('.mg-map-marker')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    if (Math.hypot(deltaX, deltaY) > 4) suppressNextClickRef.current = true;
    setPan({
      x: dragStart.panX + deltaX,
      y: dragStart.panY + deltaY,
    });
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateZoom(zoom + (event.deltaY < 0 ? 0.15 : -0.15));
  };

  const activeSourceNote = sourceById.get('tarkovbuddy-map-bundle')?.notes;

  return (
    <div className="maps-page maps-page--mapgenie">
      <section className="mg-map-hero" aria-labelledby="maps-title">
        <div>
          <span className="tb-kicker">Interactive map · MapGenie-inspired</span>
          <h1 id="maps-title">Zoom, pan, click, and inspect every marker.</h1>
          <p>MapGenie aporta la experiencia de navegación; TarkovBuddy mantiene el contrato de datos base para completar mapas de forma autónoma.</p>
        </div>
        <div className="tb-stat-row" aria-label="Resumen de mapa">
          <div><span>Map</span><strong>{selectedMap?.name}</strong></div>
          <div><span>Markers</span><strong>{visibleMarkers.length}</strong></div>
          <div><span>Quest</span><strong>{questCount}</strong></div>
          <div><span>Zoom</span><strong>{Math.round(zoom * 100)}%</strong></div>
          <div><span>Layers</span><strong>{layerCount}</strong></div>
        </div>
      </section>

      <section className="mg-map-shell" aria-label={`Mapa interactivo de ${selectedMap.name}`}>
        <aside className="mg-layer-sidebar" aria-label="Map layers">
          <div className="mg-logo-block">
            <span>Map template</span>
            <strong>{selectedMap.name}</strong>
            <small>{visibleMarkers.length} visible · {allMarkers.length} total</small>
          </div>
          <div className="mg-map-tabs" aria-label="Mapas">
            {mapTabs.map((map) => (
              <button
                key={map.id}
                type="button"
                className={selectedMap?.id === map.id ? 'active' : ''}
                onClick={() => {
                  setSelectedMapId(map.id);
                  setSelectedMarkerId(null);
                  resetViewport();
                }}
                aria-pressed={selectedMap?.id === map.id}
              >
                {mapNamesByFamily[map.familyId] ?? map.name}
              </button>
            ))}
          </div>

          <label className="mg-search">
            <span>Search map locations</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ZB-1011, Aquarius, transit..." />
          </label>

          <div className="mg-layer-actions">
            <button type="button" onClick={() => setActiveFilters(buddyFilters.map((filter) => filter.id))}>Show all</button>
            <button type="button" onClick={() => setActiveFilters([])}>Hide all</button>
          </div>

          <div className="mg-layer-groups" aria-label="Filtros de marcadores">
            <h2>Locations</h2>
            {buddyFilters.map((filter) => {
              const active = activeFilters.includes(filter.id);
              const count = allMarkers.filter((marker) => markerMatchesFilter(marker, [filter.id])).length;
              return (
                <button key={filter.id} type="button" className={active ? 'active' : ''} onClick={() => toggleFilter(filter.id)} aria-pressed={active}>
                  <span>{filter.label}</span>
                  <b>{count}</b>
                </button>
              );
            })}
          </div>
        </aside>

        {markerFile ? (
          <div className="mg-map-panel">
            <div className="mg-map-toolbar" aria-label="Map controls">
              <button type="button" onClick={() => updateZoom(zoom + 0.25)} aria-label="Zoom in">+</button>
              <button type="button" onClick={() => updateZoom(zoom - 0.25)} aria-label="Zoom out">−</button>
              <button type="button" onClick={resetViewport}>Reset</button>
              <span>{Math.round(zoom * 100)}%</span>
            </div>

            <div id="interactive-map-help" className="mg-map-help">
              Arrastra para moverte. Usa la rueda o +/- para zoom. Flechas para pan, 0 para reset y Enter/Espacio para copiar el centro visible.
            </div>
            <div
              ref={viewportRef}
              className="mg-map-viewport"
              onClick={handleMapClick}
              onKeyDown={handleMapKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onWheel={handleWheel}
              role="region"
              tabIndex={0}
              aria-describedby="interactive-map-help interactive-map-status"
              aria-label="Interactive map viewport. Drag to pan, mouse wheel or plus minus to zoom, arrow keys to pan."
            >
              <div
                ref={mapTransformRef}
                className="mg-map-transform"
                style={{
                  aspectRatio: `${markerFile.tarkovBuddy?.imageWidth ?? markerFile.mapArt.width ?? 1} / ${markerFile.tarkovBuddy?.imageHeight ?? markerFile.mapArt.height ?? 1}`,
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
              >
                <img src={markerFile.tarkovBuddy?.mapImage ?? markerFile.mapArt.asset} alt={selectedMap.name} draggable={false} />
                {visibleMarkers.map((marker, index) => {
                  const active = selectedMarker?.id === marker.id;
                  return (
                    <button
                      key={marker.id}
                      type="button"
                      className={`mg-map-marker mg-map-marker--${marker.layerId}${active ? ' active' : ''}`}
                      style={{ left: `${marker.geometry.x}%`, top: `${marker.geometry.z}%`, '--pin-color': markerColor(marker), '--marker-zoom': zoom } as React.CSSProperties}
                      title={marker.title}
                      aria-label={`${markerCode(marker, index)} ${marker.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedMarkerId(marker.id);
                      }}
                    >
                      <span>{markerCode(marker, index)}</span>
                      <em>{marker.title}</em>
                    </button>
                  );
                })}
              </div>

              <div id="interactive-map-status" className="mg-coordinate-lock" aria-live="polite">
                {lockedCoordinate ? `Copied ${lockedCoordinate}` : `Zoom ${Math.round(zoom * 100)}%. Drag map · wheel zoom · click empty space to copy x/y`}
              </div>
            </div>
          </div>
        ) : (
          <div className="mg-map-panel mg-map-panel--empty">
            <h2>{selectedMap.name}</h2>
            <p>Mapa en cola. La plantilla ya soporta pan/zoom, labels, filtros y ficha de marker cuando tengamos imagen y contrato auditados.</p>
          </div>
        )}

        <aside className="mg-detail-panel" aria-label="Selected marker details">
          {selectedMarker ? (
            <>
              <div className="mg-detail-heading">
                <span style={{ background: markerColor(selectedMarker) }}>{markerCode(selectedMarker, visibleMarkers.indexOf(selectedMarker))}</span>
                <div>
                  <p>{markerKindLabel(selectedMarker)}</p>
                  <h2>{selectedMarker.title}</h2>
                </div>
              </div>
              {selectedMarker.description && <p className="mg-detail-description">{selectedMarker.description}</p>}
              <div className="mg-detail-grid">
                <span>Coordinates</span><strong>{selectedMarker.geometry.x.toFixed(2)}%, {selectedMarker.geometry.z.toFixed(2)}%</strong>
                <span>Precision</span><strong>{selectedMarker.precision}</strong>
                <span>Confidence</span><strong>{selectedMarker.confidence}</strong>
              </div>
              <div className="mg-media-placeholder">
                <strong>Media-ready details</strong>
                <p>El contrato ya tiene sitio para galería/fotos verificadas. No copio media propietario de MapGenie; añadiremos capturas locales o fuentes con licencia clara por marker.</p>
              </div>
              <div className="mg-nearby-list">
                <h3>Nearby visible markers</h3>
                {visibleMarkers
                  .filter((marker) => marker.id !== selectedMarker.id)
                  .map((marker) => ({
                    marker,
                    distance: Math.hypot(marker.geometry.x - selectedMarker.geometry.x, marker.geometry.z - selectedMarker.geometry.z),
                  }))
                  .sort((a, b) => a.distance - b.distance)
                  .slice(0, 5)
                  .map(({ marker, distance }) => (
                    <button key={marker.id} type="button" onClick={() => focusMarker(marker)}>
                      <span>{marker.title}</span>
                      <b>{distance.toFixed(1)}%</b>
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <p>Activa una capa o selecciona un marker para ver detalles.</p>
          )}
        </aside>
      </section>

      <section className="maps-source-strip" aria-label="Fuentes del mapa piloto">
        <strong>Fuentes usadas:</strong>
        <span>UX benchmark: MapGenie para pan/zoom, side layers, labels y fichas contextuales. No se copian assets ni media propietarios.</span>
        <span>TarkovBuddy como contrato visual/datos base de {selectedMap?.name}: imagen local + marcadores x/y porcentuales · <a href="https://www.tarkovbuddy.org/maps" target="_blank" rel="noreferrer">fuente de referencia</a>.</span>
        <span>{activeSourceNote}</span>
      </section>
    </div>
  );
};

export default InteractiveMapsPage;
