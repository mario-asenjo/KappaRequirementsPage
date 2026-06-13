import assert from 'node:assert/strict';
import itemRequirementData from '../src/data/itemRequirements.json';
import {
  calculateItemRequirementSummary,
  defaultItemPlannerPreferences,
  searchItemRequirements,
  setAllRequirementInclusions,
  setRequirementInclusion,
} from '../src/utils/itemRequirements';
import { ItemRequirementIndexEntry, ItemRequirementIndexFile, ItemPlannerPreferences } from '../src/types/itemPlanner';

const data = itemRequirementData as ItemRequirementIndexFile;

assert.equal(data.schemaVersion, 1, 'item requirement index should use schemaVersion 1');
assert.equal(data.metadata.itemCount, data.items.length, 'metadata itemCount should match actual item count');
assert.ok(data.items.length > 430, 'index should cover required items plus Fandom barter-only items');
assert.ok(data.metadata.requirementCount > 950, 'index should include global quest and hideout requirements plus Fandom wiki deltas');
assert.ok((data.metadata.fandomBarterCount ?? 0) > 600, 'index should include Fandom trader barter rows');
assert.ok(data.metadata.questRequirementCount > 650, 'index should include quest item requirements from tarkov.dev and Fandom');
assert.ok(data.metadata.hideoutRequirementCount > 300, 'index should include hideout item requirements');
assert.ok((data.metadata.fandomPageCount ?? 0) > 200, 'index should parse Fandom item pages as a freshness supplement');
assert.ok((data.metadata.fandomRequirementCount ?? 0) > 500, 'index should record parsed Fandom requirement rows');
assert.ok((data.metadata.fandomMergedRequirementCount ?? 0) > 50, 'index should merge Fandom-only requirements into the planner');

const allRequirementIds = new Set<string>();
let actualRequirementCount = 0;
let actualQuestRequirementCount = 0;
let actualHideoutRequirementCount = 0;

for (const item of data.items) {
  assert.ok(item.id, 'item id is required');
  assert.ok(item.name, `item ${item.id} should have a name`);
  assert.ok(item.requirements.length > 0 || (item.barters?.length ?? 0) > 0, `${item.name} should have at least one requirement or barter`);

  const itemBarterIds = new Set<string>();
  for (const barter of item.barters ?? []) {
    assert.ok(barter.id.includes(item.id), `${barter.id} should include item id for stable trade rows`);
    assert.ok(!itemBarterIds.has(barter.id), `${item.name} has duplicate barter id ${barter.id}`);
    itemBarterIds.add(barter.id);
    assert.ok(barter.direction === 'required' || barter.direction === 'received', `${barter.id} should classify item role in trade`);
    assert.ok(barter.traderName, `${barter.id} should keep trader name`);
    assert.ok(barter.requiredItems.length > 0, `${barter.id} should include required trade inputs`);
    assert.ok(barter.receivedItems.length > 0, `${barter.id} should include received trade outputs`);
    for (const tradeItem of [...barter.requiredItems, ...barter.receivedItems]) {
      assert.ok(tradeItem.name, `${barter.id} trade item should have a name`);
      assert.ok(tradeItem.quantity > 0, `${barter.id} trade item should have positive quantity`);
    }
  }

  const itemRequirementIds = new Set<string>();
  for (const requirement of item.requirements) {
    actualRequirementCount += 1;
    if (requirement.kind === 'quest') actualQuestRequirementCount += 1;
    if (requirement.kind === 'hideout') actualHideoutRequirementCount += 1;

    assert.ok(requirement.id.includes(item.id), `${requirement.id} should include item id for stable preferences`);
    assert.ok(!itemRequirementIds.has(requirement.id), `${item.name} has duplicate requirement id ${requirement.id}`);
    itemRequirementIds.add(requirement.id);
    allRequirementIds.add(`${item.id}:${requirement.id}`);

    assert.ok(requirement.quantity > 0, `${requirement.id} should have positive quantity`);
    assert.equal(typeof requirement.countsTowardTotal, 'boolean', `${requirement.id} should declare whether it affects keep totals`);
    assert.ok(requirement.label, `${requirement.id} should have a label`);
    assert.ok(requirement.sourceName, `${requirement.id} should have a source name`);

    if (requirement.kind === 'quest') {
      assert.ok(requirement.taskId, `${requirement.id} should keep taskId`);
      assert.ok(requirement.objectiveId, `${requirement.id} should keep objectiveId`);
      assert.ok(requirement.objectiveType, `${requirement.id} should keep objectiveType`);
      assert.ok(requirement.trader, `${requirement.id} should keep trader`);
    }

    if (requirement.kind === 'hideout') {
      assert.ok(requirement.stationId, `${requirement.id} should keep stationId`);
      assert.ok(requirement.stationName, `${requirement.id} should keep stationName`);
      assert.ok(requirement.level && requirement.level > 0, `${requirement.id} should keep station level`);
      assert.ok(Array.isArray(requirement.prerequisites), `${requirement.id} should preserve hideout prerequisites`);
    }
  }
}

assert.equal(actualRequirementCount, data.metadata.requirementCount, 'metadata requirementCount should match actual rows');
assert.equal(actualQuestRequirementCount, data.metadata.questRequirementCount, 'metadata quest count should match actual rows');
assert.equal(actualHideoutRequirementCount, data.metadata.hideoutRequirementCount, 'metadata hideout count should match actual rows');
assert.equal(allRequirementIds.size, actualRequirementCount, 'requirement ids should be globally unique when scoped by item');

const toolset = data.items.find((item) => item.name === 'Toolset');
assert.ok(toolset, 'Toolset should be present as a canary item');

const toolsetResults = searchItemRequirements(data.items, 'toolset');
assert.equal(toolsetResults[0]?.id, toolset.id, 'search should find Toolset by full name');
assert.equal(searchItemRequirements(data.items, toolset.shortName ?? 'Toolset')[0]?.id, toolset.id, 'search should find Toolset by short name');

const fullToolsetSummary = calculateItemRequirementSummary(toolset as ItemRequirementIndexEntry, defaultItemPlannerPreferences);
assert.equal(fullToolsetSummary.questRequired, 10, 'Toolset quest total should include tarkov.dev rows plus Fandom story requirements');
assert.equal(fullToolsetSummary.hideoutRequired, 11, 'Toolset hideout total should match tarkov.dev canary data');
assert.equal(fullToolsetSummary.totalRequired, 21, 'Toolset all-in total should include Fandom story rows');
assert.equal(fullToolsetSummary.excludedQuantity, 0, 'all rows are included by default');
assert.ok(fullToolsetSummary.rows.every((row) => row.included), 'every row should default to included');
assert.ok(
  toolset.requirements.some((requirement) => requirement.sourceName === 'They Are Already Here' && requirement.objectiveType === 'fandomStoryRequirement'),
  'Toolset should include Fandom-only story chapter requirements missing from tarkov.dev',
);

assert.ok(
  toolset.barters?.some((barter) => barter.direction === 'received' && barter.traderName === 'Mechanic' && barter.receivedItems.some((item) => item.name === 'Toolset')),
  'Toolset should expose trader barters that can provide the item',
);

const workbenchLevelTwo = toolset.requirements.find(
  (requirement) => requirement.kind === 'hideout' && requirement.stationName === 'Workbench' && requirement.level === 2,
);
assert.ok(workbenchLevelTwo, 'Toolset should include Workbench level 2 hideout row');
assert.equal(workbenchLevelTwo.quantity, 3, 'Workbench level 2 should require 3 Toolsets');
assert.ok(workbenchLevelTwo.prerequisites?.some((requirement) => requirement.stationName === 'Workbench' && requirement.level === 1), 'Workbench level 2 should preserve station prerequisites');

const farmingObjective = toolset.requirements.find(
  (requirement) => requirement.kind === 'quest' && requirement.sourceName === 'Farming - Part 1',
);
assert.ok(farmingObjective, 'Toolset should include Farming - Part 1 quest row');
assert.equal(farmingObjective.quantity, 1, 'each Toolset quest objective should remain independently toggleable');

let preferences: ItemPlannerPreferences = setRequirementInclusion(
  toolset.id,
  workbenchLevelTwo.id,
  false,
  defaultItemPlannerPreferences,
);
let summary = calculateItemRequirementSummary(toolset, preferences);
assert.equal(summary.totalRequired, 18, 'excluding Workbench level 2 subtracts 3 Toolsets');
assert.equal(summary.hideoutRequired, 8, 'excluding a hideout row only affects hideout total');
assert.equal(summary.questRequired, 10, 'excluding a hideout row should not affect quest total');
assert.equal(summary.excludedQuantity, 3, 'excluded quantity should reflect disabled row');

preferences = setRequirementInclusion(toolset.id, farmingObjective.id, false, preferences);
summary = calculateItemRequirementSummary(toolset, preferences);
assert.equal(summary.totalRequired, 17, 'excluding a quest objective subtracts only that objective quantity');
assert.equal(summary.questRequired, 9, 'quest total should decrement after quest row exclusion');
assert.equal(summary.hideoutRequired, 8, 'hideout total should stay unchanged after quest row exclusion');

preferences = setRequirementInclusion(toolset.id, workbenchLevelTwo.id, true, preferences);
summary = calculateItemRequirementSummary(toolset, preferences);
assert.equal(summary.totalRequired, 20, 're-including a row restores its quantity');

preferences = setAllRequirementInclusions(toolset, false, preferences);
summary = calculateItemRequirementSummary(toolset, preferences);
assert.equal(summary.totalRequired, 0, 'deselect all should zero the selected item total');
assert.equal(summary.excludedQuantity, 21, 'deselect all should mark every Toolset as excluded');

preferences = setAllRequirementInclusions(toolset, true, preferences);
summary = calculateItemRequirementSummary(toolset, preferences);
assert.equal(summary.totalRequired, 21, 'select all should restore default total');

const gasAnalyzer = data.items.find((item) => item.name === 'Gas analyzer');
assert.ok(gasAnalyzer, 'Gas analyzer should be present as a canary for find/give de-duplication');
const gasAnalyzerSummary = calculateItemRequirementSummary(gasAnalyzer as ItemRequirementIndexEntry, defaultItemPlannerPreferences);
assert.equal(gasAnalyzerSummary.questRequired, 7, 'Gas analyzer keep total should count giveItem rows, not duplicate findItem rows');
assert.equal(gasAnalyzerSummary.totalRequired, 7, 'Gas analyzer should not be inflated by find-only objectives');
assert.ok(
  gasAnalyzer.requirements.some((requirement) => requirement.objectiveType === 'findItem' && !requirement.countsTowardTotal),
  'Gas analyzer should keep findItem rows visible but excluded from keep totals',
);

assert.ok(
  gasAnalyzer.barters?.some((barter) => barter.direction === 'required' && barter.traderName === 'Skier' && barter.requiredItems.some((item) => item.name === 'Gas analyzer' && item.quantity === 2)),
  'Gas analyzer should expose barters that spend the item with a trader',
);
assert.ok(
  gasAnalyzer.barters?.some((barter) => barter.direction === 'received' && barter.traderName === 'Mechanic' && barter.receivedItems.some((item) => item.name === 'Gas analyzer')),
  'Gas analyzer should expose barters that provide the item',
);

console.log('Item requirement planner tests passed');
