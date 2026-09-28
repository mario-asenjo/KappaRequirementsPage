import assert from 'node:assert/strict';
import { buildItemRequirementIndex, validateItemRequirementIndex } from './data-normalizers/itemRequirements';
import { TarkovDevItemRequirementsDataset } from './data-sources/tarkovDevItemRequirements';
import { calculateItemRequirementSummary, defaultItemPlannerPreferences } from '../src/utils/itemRequirements';

const items = {
  inputA: { id: 'inputA', name: 'inputA Name' },
  inputB: { id: 'inputB', name: 'inputB Name' },
  output: { id: 'output', name: 'output Name' },
};
const dataset: TarkovDevItemRequirementsDataset = {
  retrievedAt: '2026-09-28T00:00:00.000Z',
  items,
  itemTranslations: { 'inputA Name': 'Input A', 'inputB Name': 'Input B', 'output Name': 'Output' },
  tasks: { quest: { id: 'quest', name: 'quest Name', trader: 'trader', objectives: [{ id: 'give', type: 'giveItem', count: 2, items: ['inputA'] }] } },
  taskTranslations: { 'quest Name': 'Quest' },
  traders: { trader: { id: 'trader', name: 'trader Name' } },
  traderTranslations: { 'trader Name': 'Trader' },
  hideout: {},
  hideoutTranslations: {},
  barters: [
    { id: 'barter', trader: 'trader', minTraderLevel: 3, requiredItems: [{ item: 'inputA', count: 5 }, { item: 'inputB', count: 2 }], offeredItem: { item: 'output', count: 1 } },
    { id: 'barter', trader: 'trader', minTraderLevel: 3, requiredItems: [{ item: 'inputA', count: 5 }, { item: 'inputB', count: 2 }], offeredItem: { item: 'output', count: 1 } },
    { id: 'self', trader: 'trader', minTraderLevel: 1, requiredItems: [{ item: 'inputA', count: 1 }], offeredItem: { item: 'inputA', count: 1 } },
    { id: 'incomplete', trader: 'missing', requiredItems: [{ item: 'inputA', count: 1 }], offeredItem: { item: 'output', count: 1 } },
  ],
  sources: ['https://json.tarkov.dev/pve/barters'],
};

const index = buildItemRequirementIndex(dataset);
validateItemRequirementIndex(index);
assert.equal(index.metadata.barterCount, 2, 'duplicate and incomplete barters must not count');
assert.equal(index.metadata.barterTraderCount, 1, 'barter trader must resolve from structured ID');
assert.equal(index.metadata.bartersWithLoyaltyLevel, 2, 'loyalty level must be retained');
const input = index.items.find((item) => item.id === 'inputA')!;
const output = index.items.find((item) => item.id === 'output')!;
assert.equal(input.barters.length, 3, 'an item must retain input and output roles, including the same barter');
assert.ok(input.barters.some((barter) => barter.id === 'barter' && barter.direction === 'input'), 'input direction must be explicit');
assert.ok(input.barters.some((barter) => barter.id === 'self' && barter.direction === 'output'), 'an item can be an output in a barter where it is also an input');
const inputBarter = input.barters.find((barter) => barter.id === 'barter' && barter.direction === 'input')!;
assert.equal(inputBarter.traderName, 'Trader', 'trader translation must be used');
assert.equal(inputBarter.loyaltyLevel, 3, 'barter loyalty level must be retained');
assert.deepEqual(inputBarter.requiredItems.map((item) => [item.itemId, item.quantity]), [['inputA', 5], ['inputB', 2]], 'all barter costs must retain IDs and quantities');
assert.equal(output.barters[0].direction, 'output', 'output direction must be explicit');
assert.deepEqual(output.barters[0].receivedItems.map((item) => [item.itemId, item.quantity]), [['output', 1]], 'barter output must retain ID and quantity');
assert.equal(calculateItemRequirementSummary(input, defaultItemPlannerPreferences).totalRequired, 2, 'barters must not affect quest/hideout keep totals');

console.log('Item requirement normalizer tests passed');
