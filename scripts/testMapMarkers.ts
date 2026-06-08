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
assert.equal(groundZeroMarkers.mapArt.kind, 'tarkovbuddy-local-image', 'Ground Zero should use the TarkovBuddy-style image map asset');
assert.equal(groundZeroMarkers.tarkovBuddy.mapImage, '/images/maps/ground-zero-tarkovbuddy.webp', 'Ground Zero should expose the TarkovBuddy map image path');
assert.equal(groundZeroMarkers.tarkovBuddy.staticMarkers.length, 38, 'Ground Zero should mirror the TarkovBuddy static marker contract');
assert.equal(groundZeroMarkers.tarkovBuddy.questMarkers.length, 0, 'Ground Zero should mirror TarkovBuddy quest marker availability');

const tarkovBuddyMarkerIds = new Set<string>();
for (const [index, marker] of groundZeroMarkers.tarkovBuddy.staticMarkers.entries()) {
  assert.ok(marker.id, `TarkovBuddy marker ${index} should have a stable id`);
  assert.ok(!tarkovBuddyMarkerIds.has(marker.id), `${marker.id} should be unique in TarkovBuddy marker contract`);
  tarkovBuddyMarkerIds.add(marker.id);
  assert.ok(['extract', 'spawn', 'cultist', 'transit'].includes(marker.type), `${marker.id} should use a known TarkovBuddy marker type`);
  assert.ok(marker.x >= 0 && marker.x <= 100, `${marker.id} should use image-percent x coordinate`);
  assert.ok(marker.y >= 0 && marker.y <= 100, `${marker.id} should use image-percent y coordinate`);
  assert.ok(marker.title, `${marker.id} should keep the marker title`);
}

const markersByLayer = new Map<string, number>();
const markerIds = new Set<string>();
const markersById = new Map(groundZeroMarkers.markers.map((marker) => [marker.id, marker]));
for (const staticMarker of groundZeroMarkers.tarkovBuddy.staticMarkers) {
  const converted = markersById.get(staticMarker.id);
  assert.ok(converted, `${staticMarker.id} should have a converted render marker`);
  assert.equal(converted.title, staticMarker.title, `${staticMarker.id} should mirror title`);
  assert.equal(converted.description, staticMarker.desc, `${staticMarker.id} should mirror description`);
  assert.equal(converted.geometry.x, staticMarker.x, `${staticMarker.id} should mirror x coordinate`);
  assert.equal(converted.geometry.z, staticMarker.y, `${staticMarker.id} should mirror y coordinate`);
  assert.equal(converted.meta?.tarkovBuddyType, staticMarker.type, `${staticMarker.id} should mirror marker type`);
  assert.equal(converted.meta?.tarkovBuddySubtype ?? null, staticMarker.subtype ?? null, `${staticMarker.id} should mirror marker subtype`);
}

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
