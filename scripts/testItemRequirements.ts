import assert from 'node:assert/strict';
import itemRequirementData from '../src/data/itemRequirements.json';
import {
  calculateItemRequirementSummary,
  defaultItemPlannerPreferences,
  searchItemRequirements,
  setAllRequirementInclusions,
  setRequirementInclusion,
} from '../src/utils/itemRequirements';
import { ItemRequirementIndexFile, ItemPlannerPreferences } from '../src/types/itemPlanner';

const data = itemRequirementData as ItemRequirementIndexFile;
assert.equal(data.schemaVersion, 2, 'item requirement index should use schemaVersion 2');
assert.equal(data.metadata.itemCount, data.items.length, 'metadata itemCount should match actual item count');
assert.ok(data.items.length > 3_000, 'index should include current structured quest/hideout and barter items');
assert.ok(data.metadata.requirementCount > 10_000, 'index should retain quest and hideout requirements');
assert.ok(data.metadata.hideoutRequirementCount > 300, 'index should retain hideout requirements');
assert.ok(data.metadata.barterCount > 800, 'index should include structured trader barters');
assert.equal(data.metadata.bartersWithLoyaltyLevel + data.metadata.bartersWithoutLoyaltyLevel, data.metadata.barterCount, 'barter loyalty counters should reconcile');
assert.ok(data.metadata.sources.every((source) => source.startsWith('https://json.tarkov.dev/pve/')), 'generated structured provenance must be json.tarkov.dev only');

const barterIds = new Set<string>();
let requirementCount = 0;
let questRequirementCount = 0;
let hideoutRequirementCount = 0;
let barterLinks = 0;
for (const item of data.items) {
  assert.ok(item.id && item.name, 'every indexed item must have stable identity');
  assert.ok(item.requirements.length > 0 || item.barters.length > 0, `${item.name} must have a requirement or barter`);
  const localBarters = new Set<string>();
  for (const barter of item.barters) {
    const localId = `${barter.id}:${barter.direction}`;
    assert.ok(!localBarters.has(localId), `${item.name} has duplicate barter row ${localId}`);
    localBarters.add(localId);
    barterIds.add(barter.id);
    barterLinks += 1;
    assert.ok(barter.direction === 'input' || barter.direction === 'output', 'barter item role must be explicit');
    assert.ok(barter.traderId && barter.traderName, 'barter trader must be structured and resolved');
    assert.ok(barter.loyaltyLevel === undefined || (Number.isInteger(barter.loyaltyLevel) && barter.loyaltyLevel >= 1 && barter.loyaltyLevel <= 4), 'barter loyalty level must be valid');
    assert.ok(barter.requiredItems.length > 0 && barter.receivedItems.length > 0, 'barter must include both sides');
    for (const tradeItem of [...barter.requiredItems, ...barter.receivedItems]) assert.ok(tradeItem.itemId && tradeItem.name && tradeItem.quantity > 0, 'barter items must retain IDs, names and positive quantities');
  }
  for (const requirement of item.requirements) {
    requirementCount += 1;
    if (requirement.kind === 'quest') questRequirementCount += 1;
    if (requirement.kind === 'hideout') hideoutRequirementCount += 1;
    assert.ok(requirement.id.includes(item.id), `${requirement.id} should include item id for stable preferences`);
    assert.ok(requirement.quantity > 0, `${requirement.id} should have positive quantity`);
  }
}
assert.equal(requirementCount, data.metadata.requirementCount, 'metadata requirement count must reconcile');
assert.equal(questRequirementCount, data.metadata.questRequirementCount, 'metadata quest count must reconcile');
assert.equal(hideoutRequirementCount, data.metadata.hideoutRequirementCount, 'metadata hideout count must reconcile');
assert.equal(barterIds.size, data.metadata.barterCount, 'metadata barter count must reconcile');
assert.equal(barterLinks, data.metadata.barterItemLinkCount, 'metadata barter link count must reconcile');

const toolset = data.items.find((item) => item.name === 'Toolset');
const gasAnalyzer = data.items.find((item) => item.name === 'Gas analyzer');
assert.ok(toolset && gasAnalyzer, 'canary items must be available');
assert.equal(searchItemRequirements(data.items, 'toolset')[0]?.id, toolset.id, 'search must still find requirements by item name');
assert.ok(toolset.barters.some((barter) => barter.direction === 'output' && barter.traderName === 'Mechanic' && barter.loyaltyLevel === 1 && barter.requiredItems.length > 1), 'Toolset must expose its multi-cost structured barter output');
assert.ok(gasAnalyzer.barters.some((barter) => barter.direction === 'input' && barter.requiredItems.some((item) => item.itemId === gasAnalyzer.id && item.quantity === 2)), 'Gas analyzer must expose an input barter with its cost quantity');
assert.ok(gasAnalyzer.barters.some((barter) => barter.direction === 'output'), 'Gas analyzer must expose a barter output');

const original = calculateItemRequirementSummary(toolset, defaultItemPlannerPreferences);
const expectedTotal = toolset.requirements.filter((row) => row.countsTowardTotal).reduce((total, row) => total + row.quantity, 0);
assert.equal(original.totalRequired, expectedTotal, 'barters must not contaminate keep totals');
const toggledRequirement = toolset.requirements.find((row) => row.countsTowardTotal)!;
let preferences: ItemPlannerPreferences = setRequirementInclusion(toolset.id, toggledRequirement.id, false, defaultItemPlannerPreferences);
assert.equal(calculateItemRequirementSummary(toolset, preferences).totalRequired, expectedTotal - toggledRequirement.quantity, 'existing requirement exclusion must still work');
preferences = setAllRequirementInclusions(toolset, false, preferences);
assert.equal(calculateItemRequirementSummary(toolset, preferences).totalRequired, 0, 'existing requirement selection must still work');

console.log('Item requirement planner tests passed');
