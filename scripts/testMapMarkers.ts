import assert from 'node:assert/strict';
import mapsIndex from '../src/data/maps/index.json';
import markerLayers from '../src/data/mapMarkerLayers.json';
import mapSources from '../src/data/mapSources.json';
import groundZeroMarkers from '../src/data/mapMarkers/ground-zero.json';

const mapIds = new Set(mapsIndex.maps.map((map) => map.id));
const layerIds = new Set(markerLayers.layers.map((layer) => layer.id));
const sourceIds = new Set(mapSources.sources.map((source) => source.id));

assert.equal(groundZeroMarkers.schemaVersion, 1, 'Ground Zero markers should use schemaVersion 1');
assert.equal(groundZeroMarkers.mapId, 'ground-zero', 'Ground Zero marker file should target the main Ground Zero map');
assert.ok(mapIds.has(groundZeroMarkers.mapId), 'Ground Zero marker file should reference an existing map');
assert.ok(groundZeroMarkers.bounds.minX < groundZeroMarkers.bounds.maxX, 'Ground Zero bounds should include X range');
assert.ok(groundZeroMarkers.bounds.minZ < groundZeroMarkers.bounds.maxZ, 'Ground Zero bounds should include Z range');
assert.ok(groundZeroMarkers.markers.length >= 20, 'Ground Zero should ship a real marker set, not a placeholder');

const markersByLayer = new Map<string, number>();
const markerIds = new Set<string>();
const allowedConfidence = new Set(['exact', 'high', 'medium', 'low']);
const allowedPrecision = new Set(['coordinate', 'zone', 'map-only']);
for (const marker of groundZeroMarkers.markers) {
  markersByLayer.set(marker.layerId, (markersByLayer.get(marker.layerId) ?? 0) + 1);
  assert.ok(marker.id, 'marker should have a stable id');
  assert.ok(!markerIds.has(marker.id), `${marker.id} should be unique`);
  markerIds.add(marker.id);
  assert.ok(marker.title, `${marker.id} should have a title`);
  assert.equal(marker.mapId, groundZeroMarkers.mapId, `${marker.id} should target the marker file map`);
  assert.ok(mapIds.has(marker.mapId), `${marker.id} should reference an existing map`);
  assert.ok(layerIds.has(marker.layerId), `${marker.id} should reference an existing layer`);
  assert.ok(allowedConfidence.has(marker.confidence), `${marker.id} should use accepted confidence`);
  assert.ok(allowedPrecision.has(marker.precision), `${marker.id} should use accepted precision`);
  assert.equal(marker.geometry.type, 'point', `${marker.id} should render as a point in the first map slice`);
  assert.ok(Number.isFinite(marker.geometry.x), `${marker.id} should include numeric x coordinate`);
  assert.ok(Number.isFinite(marker.geometry.z), `${marker.id} should include numeric z coordinate`);
  assert.ok(marker.geometry.x >= groundZeroMarkers.bounds.minX && marker.geometry.x <= groundZeroMarkers.bounds.maxX, `${marker.id} x should fit map bounds`);
  assert.ok(marker.geometry.z >= groundZeroMarkers.bounds.minZ && marker.geometry.z <= groundZeroMarkers.bounds.maxZ, `${marker.id} z should fit map bounds`);
  assert.ok(marker.sourceIds.length > 0, `${marker.id} should cite at least one source`);
  for (const sourceId of marker.sourceIds) {
    assert.ok(sourceIds.has(sourceId), `${marker.id} should reference existing source ${sourceId}`);
  }
}

for (const requiredLayer of ['extracts', 'spawns', 'transits']) {
  assert.ok((markersByLayer.get(requiredLayer) ?? 0) > 0, `Ground Zero should include ${requiredLayer} markers`);
}

const groundZeroIndex = mapsIndex.maps.find((map) => map.id === 'ground-zero');
assert.equal(groundZeroIndex?.coverageStatus, 'pilot-markers', 'Ground Zero should show pilot marker coverage in the map index');
assert.equal(groundZeroIndex?.markerCount, groundZeroMarkers.markers.length, 'Ground Zero marker count should match marker file');

console.log('Ground Zero map marker tests passed');
