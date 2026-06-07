import assert from 'node:assert/strict';
import mapsIndex from '../src/data/maps/index.json';
import mapSources from '../src/data/mapSources.json';
import markerLayers from '../src/data/mapMarkerLayers.json';

const expectedMapIds = [
  'factory',
  'night-factory',
  'customs',
  'woods',
  'shoreline',
  'interchange',
  'reserve',
  'the-lab',
  'lighthouse',
  'streets-of-tarkov',
  'ground-zero',
  'ground-zero-21',
  'ground-zero-tutorial',
  'the-labyrinth',
  'terminal',
  'icebreaker',
];

assert.equal(mapsIndex.schemaVersion, 1, 'maps index should use schemaVersion 1');
assert.equal(mapsIndex.maps.length, expectedMapIds.length, 'maps index should cover every tarkov.dev map variant');
assert.deepEqual(
  mapsIndex.maps.map((map) => map.id).sort(),
  expectedMapIds.sort(),
  'maps index should include all maps reported by tarkov.dev'
);

const sourceIds = new Set(mapSources.sources.map((source) => source.id));
assert.equal(sourceIds.size, mapSources.sources.length, 'source IDs should be unique');
assert.ok(sourceIds.has('tarkov-dev-maps'), 'sources should include tarkov.dev as map catalog source');
assert.ok(sourceIds.has('eft-wiki'), 'sources should include the Escape from Tarkov Wiki as primary location source');

const layerIds = new Set(markerLayers.layers.map((layer) => layer.id));
assert.equal(layerIds.size, markerLayers.layers.length, 'layer IDs should be unique');
for (const requiredLayer of ['task-objectives', 'quest-items', 'extracts', 'spawns', 'bosses', 'transits']) {
  assert.ok(layerIds.has(requiredLayer), `marker layer ${requiredLayer} should be planned`);
}

for (const map of mapsIndex.maps) {
  const duplicateMapIds = mapsIndex.maps.filter((candidate) => candidate.id === map.id);
  const duplicateTarkovDevIds = mapsIndex.maps.filter((candidate) => candidate.tarkovDevId === map.tarkovDevId);
  assert.equal(duplicateMapIds.length, 1, `${map.id} should have a unique id`);
  assert.equal(duplicateTarkovDevIds.length, 1, `${map.id} should have a unique tarkovDevId`);
  assert.ok(map.id, 'map id is required');
  assert.ok(map.name, `map ${map.id} should have a display name`);
  assert.ok(map.normalizedName, `map ${map.id} should keep tarkov.dev normalizedName`);
  assert.ok(map.wikiUrl?.startsWith('https://escapefromtarkov.fandom.com/wiki/'), `${map.id} should link to EFT Wiki`);
  assert.ok(map.sourceIds.includes('tarkov-dev-maps'), `${map.id} should cite tarkov.dev`);
  assert.ok(map.sourceIds.includes('eft-wiki'), `${map.id} should cite wiki`);
  for (const sourceId of map.sourceIds) {
    assert.ok(sourceIds.has(sourceId), `${map.id} references existing source ${sourceId}`);
  }
  assert.ok(map.plannedLayers.length >= 6, `${map.id} should expose all planned interactive layers`);
  for (const layerId of map.plannedLayers) {
    assert.ok(layerIds.has(layerId), `${map.id} references existing layer ${layerId}`);
  }
  assert.ok(map.coverageStatus !== 'complete', `${map.id} should not claim complete marker coverage before audited coordinates exist`);
}

console.log('Map data contract tests passed');
