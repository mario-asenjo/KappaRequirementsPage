import assert from 'node:assert/strict';
import { ItemRequirementIndexEntry } from '../src/types/itemPlanner';
import { mergeFandomRequirements, parseFandomItemPage } from './fandomItemRequirements';

const toolsetSnippet = `{{Infobox item
|node = 590c2e1186f77425357b6124
|id = item_tools_toolset
}}
'''{{PAGENAME}}''' (TSet) is an [[Loot|item]] in ''[[Escape from Tarkov]]''.

==Quests==
* 2 need to be obtained for the quest [[Farming - Part 1]]
* 1 needs to be obtained for the story chapter [[They Are Already Here]] if you have completed [[Choose Your Friends Wisely]]
* 2 need to be found [[Found in raid|<font color="red">in raid</font>]] for the story chapter [[Falling Skies]] if you have completed [[Boreas]]

==Hideout==
* 3 need to be found [[Found in raid|<font color="red">in raid</font>]] for the [[Hideout#Modules|Workbench level 2]]
* 1 needs to be found [[Found in raid|<font color="red">in raid</font>]] for the [[Hideout#Modules|Gym]]
`;

const gasAnalyzerSnippet = `{{Infobox item
|node = 590a3efd86f77437d351a25b
|id = item_electr_gasanalyzer
}}
'''{{PAGENAME}}''' (GasAn) is an [[Loot|item]] in ''[[Escape from Tarkov]]''.

==Quests==
* 1 needs to be found [[Found in raid|<font color="red">in raid</font>]] for the quest [[Sanitary Standards - Part 1]]
* 2 need to be found [[Found in raid|<font color="red">in raid</font>]] for the quest [[Sanitary Standards - Part 2]]
* 4 need to be found [[Found in raid|<font color="red">in raid</font>]] for the quest [[Network Provider - Part 1]]
`;

const uppercaseIdSnippet = `{{Infobox item
|image size = 64x64px
|ID                 =event_container_airdrop
}}
'''{{PAGENAME}}''' is an [[Loot|item]] in ''[[Escape from Tarkov]]''.

==Quests==
* 1 needs to be obtained for the quest [[Restocking Supplies]]
`;

const parsedToolset = parseFandomItemPage({ title: 'Toolset', wikitext: toolsetSnippet });
assert.ok(parsedToolset, 'Toolset snippet should parse requirements');
assert.equal(parsedToolset.item.id, '590c2e1186f77425357b6124', 'Fandom node should be used as stable item id');
assert.equal(parsedToolset.item.shortName, 'TSet', 'short name should be extracted from intro');
assert.equal(parsedToolset.requirements.length, 5, 'Toolset snippet should parse quest and hideout rows');
assert.ok(
  parsedToolset.requirements.some((requirement) => requirement.sourceName === 'They Are Already Here' && requirement.objectiveType === 'fandomStoryRequirement'),
  'story chapter rows should be retained as Fandom quest requirements',
);
assert.ok(
  parsedToolset.requirements.some((requirement) => requirement.sourceName === 'Falling Skies' && requirement.foundInRaid),
  'story chapter rows with FIR and trailing conditional links should keep the story chapter source',
);
assert.ok(
  !parsedToolset.requirements.some((requirement) => requirement.sourceName === 'Choose Your Friends Wisely' || requirement.sourceName === 'Boreas'),
  'conditional links after the source should not replace the real quest/story source',
);
assert.ok(
  parsedToolset.requirements.some((requirement) => requirement.kind === 'hideout' && requirement.stationName === 'Workbench' && requirement.level === 2 && requirement.quantity === 3),
  'hideout station and level should parse from Hideout module links',
);
assert.ok(parsedToolset.requirements.every((requirement) => requirement.countsTowardTotal), 'Fandom item page rows describe required keep counts');

const parsedGasAnalyzer = parseFandomItemPage({ title: 'Gas analyzer', wikitext: gasAnalyzerSnippet });
assert.ok(parsedGasAnalyzer, 'Gas analyzer snippet should parse requirements');
assert.equal(parsedGasAnalyzer.requirements.reduce((total, requirement) => total + requirement.quantity, 0), 7, 'Fandom Gas analyzer requirements should represent keep total directly');

const parsedUppercaseId = parseFandomItemPage({ title: 'Airdrop container', wikitext: uppercaseIdSnippet });
assert.ok(parsedUppercaseId, 'uppercase ID snippet should parse requirements');
assert.equal(parsedUppercaseId.item.id, 'fandom:event_container_airdrop', 'parser should read exact uppercase ID field and not image size');
assert.ok(parsedUppercaseId.requirements.every((requirement) => requirement.id.includes(parsedUppercaseId.item.id)), 'generated Fandom-only row ids should include the item id');

const index = new Map<string, ItemRequirementIndexEntry>();
index.set('590c2e1186f77425357b6124', {
  id: '590c2e1186f77425357b6124',
  name: 'Toolset',
  requirements: [
    {
      id: 'quest:tarkov:farming:toolset',
      kind: 'quest',
      quantity: 2,
      countsTowardTotal: true,
      label: 'Farming - Part 1',
      sourceId: 'tarkov:farming',
      sourceName: 'Farming - Part 1',
      trader: 'Mechanic',
      taskId: 'tarkov:farming',
      objectiveId: 'tarkov:farming:objective',
      objectiveType: 'plantItem',
    },
    {
      id: 'hideout:tarkov:workbench:2:toolset',
      kind: 'hideout',
      quantity: 3,
      countsTowardTotal: true,
      label: 'Workbench level 2',
      sourceId: 'tarkov:workbench:2',
      sourceName: 'Workbench',
      stationId: 'tarkov:workbench',
      stationName: 'Workbench',
      level: 2,
      prerequisites: [],
    },
  ],
});

const mergeStats = mergeFandomRequirements(index, [parsedToolset]);
const mergedToolset = index.get('590c2e1186f77425357b6124');
assert.ok(mergedToolset, 'merged Toolset should remain in index');
assert.equal(mergeStats.parsedRequirementCount, 5, 'merge stats should count parsed Fandom rows');
assert.equal(mergeStats.mergedRequirementCount, 3, 'merge should add only rows absent from tarkov.dev');
assert.equal(
  mergedToolset.requirements.filter((requirement) => requirement.sourceName === 'Farming - Part 1').length,
  1,
  'merge should not duplicate quest rows already present from tarkov.dev',
);
assert.equal(
  mergedToolset.requirements.filter((requirement) => requirement.kind === 'hideout' && requirement.stationName === 'Workbench' && requirement.level === 2).length,
  1,
  'merge should not duplicate hideout rows already present from tarkov.dev',
);
assert.ok(
  mergedToolset.requirements.some((requirement) => requirement.sourceName === 'They Are Already Here'),
  'merge should add newer Fandom-only quest/story rows',
);

console.log('Fandom item requirement parser tests passed');
