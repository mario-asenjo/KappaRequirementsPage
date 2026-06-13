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

==Trading==
{|class="wikitable"
|-
![[File:Plier Icon.png|frameless|link=Pliers]] x1<br/>[[Pliers]]<br/>+<br/>[[File:Screwdriver Icon.png|frameless|link=Screwdriver]] x1<br/>[[Screwdriver]]<br/>+<br/>[[File:Wrench Icon.png|frameless|link=Wrench]] x1<br/>[[Wrench]]<br/>+<br/>[[File:Insulating tape Icon.png|frameless|link=Insulating tape]] x1<br/>[[Insulating tape]]<br/>+<br/>[[File:Construction Measuring Tape Icon.png|frameless|link=Construction measuring tape]] x1<br/>[[Construction measuring tape]]
!<big>→</big>
![[File:Mechanic 1 icon.png|frameless|link=Mechanic]]<br/>[[Mechanic|Mechanic LL1]]
!<big>→</big>
![[File:Toolsicon.png|frameless|link=Toolset]]
[[Toolset]]
|}
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

==Trading==
{|class="wikitable"
|-
![[File:Gas Analyzer Icon.png|frameless|link=Gas analyzer]] x2<br/>[[Gas analyzer]]
!<big>→</big>
![[File:Skier 2 icon.png|frameless|link=Skier]]<br/>[[Skier|Skier LL2]] After completing his task [[Chemical - Part 4]]
!<big>→</big>
![[File:RFB icon.png|frameless|link=Kel-Tec RFB 7.62x51 rifle]]
[[Kel-Tec RFB 7.62x51 rifle]]
|-
![[File:CPU Fan Icon.png|frameless|link=CPU fan]] x1<br/>[[CPU fan]]
!<big>→</big>
![[File:Mechanic 1 icon.png|frameless|link=Mechanic]]<br/>[[Mechanic|Mechanic LL1]]
!<big>→</big>
![[File:Gas Analyzer Icon.png|frameless|link=Gas analyzer]]
[[Gas analyzer]]
|}
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
assert.equal(parsedToolset.barters.length, 1, 'Toolset snippet should parse Trading barter rows');
assert.equal(parsedToolset.barters[0].direction, 'received', 'Toolset barter should show the item as the trader output');
assert.equal(parsedToolset.barters[0].traderName, 'Mechanic');
assert.equal(parsedToolset.barters[0].traderLevel, 1);
assert.equal(parsedToolset.barters[0].receivedItems[0].name, 'Toolset');
assert.equal(parsedToolset.barters[0].requiredItems.length, 5);

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
assert.equal(parsedGasAnalyzer.barters.length, 2, 'Gas analyzer should parse spent and received barter rows');
assert.ok(
  parsedGasAnalyzer.barters.some((barter) => barter.direction === 'required' && barter.traderName === 'Skier' && barter.traderLevel === 2 && barter.traderRequirement === 'After completing his task Chemical - Part 4' && barter.requiredItems.some((item) => item.name === 'Gas analyzer' && item.quantity === 2) && barter.receivedItems.some((item) => item.name === 'Kel-Tec RFB 7.62x51 rifle')),
  'Gas analyzer spent barter should capture trader, prerequisite, quantity, and reward',
);
assert.ok(
  parsedGasAnalyzer.barters.some((barter) => barter.direction === 'received' && barter.traderName === 'Mechanic' && barter.traderLevel === 1 && barter.requiredItems.some((item) => item.name === 'CPU fan' && item.quantity === 1) && barter.receivedItems.some((item) => item.name === 'Gas analyzer')),
  'Gas analyzer received barter should capture source ingredient and trader',
);

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
