import assert from 'node:assert/strict';
import mapsIndex from '../src/data/maps/index.json';
import markerLayers from '../src/data/mapMarkerLayers.json';
import mapSources from '../src/data/mapSources.json';
import customsMarkers from '../src/data/mapMarkers/customs.json';
import groundZeroMarkers from '../src/data/mapMarkers/ground-zero.json';

const mapIds = new Set(mapsIndex.maps.map((map) => map.id));
const layerIds = new Set(markerLayers.layers.map((layer) => layer.id));
const sourceIds = new Set(mapSources.sources.map((source) => source.id));
const allowedConfidence = new Set(['exact', 'high', 'medium', 'low']);
const allowedPrecision = new Set(['coordinate', 'zone', 'map-only']);
const allowedTarkovBuddyTypes = new Set(['extract', 'spawn', 'boss', 'cultist', 'transit']);

const markerFiles = [
  {
    label: 'Ground Zero',
    file: groundZeroMarkers,
    mapId: 'ground-zero',
    image: '/images/maps/ground-zero-tarkovbuddy.webp',
    staticCount: 38,
    questCount: 0,
    requiredLayers: ['extracts', 'spawns', 'transits'],
  },
  {
    label: 'Customs',
    file: customsMarkers,
    mapId: 'customs',
    image: '/images/maps/customs-tarkovbuddy.webp',
    staticCount: 62,
    questCount: 40,
    requiredLayers: ['task-objectives', 'extracts', 'spawns', 'bosses', 'transits'],
  },
];

for (const spec of markerFiles) {
  const { file, label } = spec;
  assert.equal(file.schemaVersion, 1, `${label} markers should use schemaVersion 1`);
  assert.equal(file.mapId, spec.mapId, `${label} marker file should target its main map`);
  assert.ok(mapIds.has(file.mapId), `${label} marker file should reference an existing map`);
  assert.ok(file.bounds.minX < file.bounds.maxX, `${label} bounds should include X range`);
  assert.ok(file.bounds.minZ < file.bounds.maxZ, `${label} bounds should include Z range`);
  assert.ok(file.markers.length >= spec.staticCount, `${label} should ship a real marker set, not a placeholder`);
  assert.equal(file.mapArt.kind, 'tarkovbuddy-local-image', `${label} should use the TarkovBuddy-style image map asset`);
  assert.equal(file.tarkovBuddy.mapImage, spec.image, `${label} should expose the TarkovBuddy map image path`);
  assert.equal(file.tarkovBuddy.staticMarkers.length, spec.staticCount, `${label} should mirror the TarkovBuddy static marker contract`);
  assert.equal(file.tarkovBuddy.questMarkers.length, spec.questCount, `${label} should mirror TarkovBuddy quest marker availability`);
  assert.ok(file.tarkovBuddy.imageWidth > 0, `${label} should expose image width`);
  assert.ok(file.tarkovBuddy.imageHeight > 0, `${label} should expose image height`);

  const tarkovBuddyMarkerIds = new Set<string>();
  for (const [index, marker] of file.tarkovBuddy.staticMarkers.entries()) {
    assert.ok(marker.id, `${label} TarkovBuddy marker ${index} should have a stable id`);
    assert.ok(!tarkovBuddyMarkerIds.has(marker.id), `${marker.id} should be unique in TarkovBuddy marker contract`);
    tarkovBuddyMarkerIds.add(marker.id);
    assert.ok(allowedTarkovBuddyTypes.has(marker.type), `${marker.id} should use a known TarkovBuddy marker type`);
    assert.ok(marker.x >= 0 && marker.x <= 100, `${marker.id} should use image-percent x coordinate`);
    assert.ok(marker.y >= 0 && marker.y <= 100, `${marker.id} should use image-percent y coordinate`);
    assert.ok(marker.title, `${marker.id} should keep the marker title`);
  }

  for (const [index, questMarker] of file.tarkovBuddy.questMarkers.entries()) {
    assert.ok(questMarker.quest, `${label} quest marker ${index} should cite a quest`);
    assert.ok(questMarker.x >= 0 && questMarker.x <= 100, `${label} quest marker ${index} should use image-percent x coordinate`);
    assert.ok(questMarker.y >= 0 && questMarker.y <= 100, `${label} quest marker ${index} should use image-percent y coordinate`);
  }

  const markersByLayer = new Map<string, number>();
  const markerIds = new Set<string>();
  const markersById = new Map(file.markers.map((marker) => [marker.id, marker]));
  for (const staticMarker of file.tarkovBuddy.staticMarkers) {
    const converted = markersById.get(staticMarker.id);
    assert.ok(converted, `${staticMarker.id} should have a converted render marker`);
    assert.equal(converted.title, staticMarker.title, `${staticMarker.id} should mirror title`);
    assert.equal(converted.description ?? '', staticMarker.desc ?? '', `${staticMarker.id} should mirror description`);
    assert.equal(converted.geometry.x, staticMarker.x, `${staticMarker.id} should mirror x coordinate`);
    assert.equal(converted.geometry.z, staticMarker.y, `${staticMarker.id} should mirror y coordinate`);
    assert.equal(converted.meta?.tarkovBuddyType, staticMarker.type, `${staticMarker.id} should mirror marker type`);
    assert.equal(converted.meta?.tarkovBuddySubtype ?? null, staticMarker.subtype ?? null, `${staticMarker.id} should mirror marker subtype`);
  }

  for (const marker of file.markers) {
    markersByLayer.set(marker.layerId, (markersByLayer.get(marker.layerId) ?? 0) + 1);
    assert.ok(marker.id, `${label} marker should have a stable id`);
    assert.ok(!markerIds.has(marker.id), `${marker.id} should be unique`);
    markerIds.add(marker.id);
    assert.ok(marker.title, `${marker.id} should have a title`);
    assert.equal(marker.mapId, file.mapId, `${marker.id} should target the marker file map`);
    assert.ok(mapIds.has(marker.mapId), `${marker.id} should reference an existing map`);
    assert.ok(layerIds.has(marker.layerId), `${marker.id} should reference an existing layer`);
    assert.ok(allowedConfidence.has(marker.confidence), `${marker.id} should use accepted confidence`);
    assert.ok(allowedPrecision.has(marker.precision), `${marker.id} should use accepted precision`);
    assert.equal(marker.geometry.type, 'point', `${marker.id} should render as a point in the first map slice`);
    assert.ok(Number.isFinite(marker.geometry.x), `${marker.id} should include numeric x coordinate`);
    assert.ok(Number.isFinite(marker.geometry.z), `${marker.id} should include numeric z coordinate`);
    assert.ok(marker.geometry.x >= file.bounds.minX && marker.geometry.x <= file.bounds.maxX, `${marker.id} x should fit map bounds`);
    assert.ok(marker.geometry.z >= file.bounds.minZ && marker.geometry.z <= file.bounds.maxZ, `${marker.id} z should fit map bounds`);
    assert.ok(marker.sourceIds.length > 0, `${marker.id} should cite at least one source`);
    for (const sourceId of marker.sourceIds) {
      assert.ok(sourceIds.has(sourceId), `${marker.id} should reference existing source ${sourceId}`);
    }
  }

  for (const requiredLayer of spec.requiredLayers) {
    assert.ok((markersByLayer.get(requiredLayer) ?? 0) > 0, `${label} should include ${requiredLayer} markers`);
  }

  const mapIndex = mapsIndex.maps.find((map) => map.id === spec.mapId);
  assert.equal(mapIndex?.coverageStatus, 'pilot-markers', `${label} should show pilot marker coverage in the map index`);
  assert.equal(mapIndex?.markerCount, file.markers.length, `${label} marker count should match marker file`);
}

console.log('TarkovBuddy-style map marker tests passed');
