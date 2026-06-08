export type MapCoverageStatus = 'cataloged' | 'source-audit' | 'pilot-markers' | 'complete';
export type MapConfidence = 'exact' | 'high' | 'medium' | 'low';
export type MapPrecision = 'coordinate' | 'zone' | 'map-only';
export type MapGeometryType = 'point' | 'area' | 'circle' | 'route';

export type MapLayerId =
  | 'task-objectives'
  | 'quest-items'
  | 'extracts'
  | 'spawns'
  | 'bosses'
  | 'transits';

export interface MapLayerDefinition {
  id: MapLayerId;
  label: string;
  description: string;
  priority: number;
  planned: boolean;
}

export interface MapSourceDefinition {
  id: string;
  label: string;
  kind: 'api' | 'wiki' | 'manual-verification' | 'community-reference';
  url: string;
  role: string;
  confidenceFloor: MapConfidence;
  notes: string;
}

export interface InteractiveMapDefinition {
  id: string;
  tarkovDevId: string;
  name: string;
  normalizedName: string;
  wikiUrl: string;
  familyId: string;
  minPmcLevelHint?: number;
  sourceIds: string[];
  plannedLayers: MapLayerId[];
  coverageStatus: MapCoverageStatus;
  markerCount: number;
  sourcePolicy: string;
}

export interface InteractiveMapsIndex {
  schemaVersion: 1;
  revision: string;
  generatedFrom: string;
  maps: InteractiveMapDefinition[];
}

export interface InteractiveMapSources {
  schemaVersion: 1;
  revision: string;
  sources: MapSourceDefinition[];
}

export interface InteractiveMapLayerCatalog {
  schemaVersion: 1;
  revision: string;
  layers: MapLayerDefinition[];
}

export interface MapMarkerGeometryPoint {
  type: 'point';
  x: number;
  y?: number;
  z: number;
}

export interface MapMarkerLinks {
  taskIds?: string[];
  objectiveIds?: string[];
  itemIds?: string[];
  traderIds?: string[];
  wikiUrl?: string;
}

export interface MapMarkerDefinition {
  id: string;
  mapId: string;
  layerId: MapLayerId;
  category: string;
  title: string;
  description?: string;
  geometry: MapMarkerGeometryPoint;
  links: MapMarkerLinks;
  sourceIds: string[];
  confidence: MapConfidence;
  precision: MapPrecision;
  meta?: Record<string, unknown>;
}

export type TarkovBuddyStaticMarkerType = 'extract' | 'spawn' | 'boss' | 'cultist' | 'transit' | string;

export interface TarkovBuddyStaticMarker {
  id: string;
  type: TarkovBuddyStaticMarkerType;
  subtype?: 'pmc' | 'scav' | 'coop' | string;
  x: number;
  y: number;
  title: string;
  desc: string;
}

export interface TarkovBuddyQuestMarker {
  quest: string;
  x: number;
  y: number;
  index?: number;
  total?: number;
}

export interface TarkovBuddyMapCompatibility {
  mapName?: string;
  mapImage: string;
  imageWidth?: number;
  imageHeight?: number;
  staticMarkers: TarkovBuddyStaticMarker[];
  questMarkers: TarkovBuddyQuestMarker[];
}

export interface MapMarkerFile {
  schemaVersion: 1;
  revision: string;
  mapId: string;
  familyId?: string;
  sourceQuery?: string;
  coordinateSpace?: string;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  projection: {
    type: string;
    xAxis?: string;
    yAxis?: string;
    coordinateSpace?: string;
    invertZ: boolean;
    note?: string;
  };
  mapArt: {
    kind: string;
    title: string;
    sourceIds: string[];
    asset?: string;
    width?: number;
    height?: number;
    note: string;
  };
  tarkovBuddy?: TarkovBuddyMapCompatibility;
  markers: MapMarkerDefinition[];
}
