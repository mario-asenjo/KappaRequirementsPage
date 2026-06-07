export type MapCoverageStatus = 'cataloged' | 'source-audit' | 'pilot-markers' | 'complete';
export type MapConfidence = 'exact' | 'high' | 'medium' | 'low';
export type MapPrecision = 'coordinate' | 'zone' | 'map-only';

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
