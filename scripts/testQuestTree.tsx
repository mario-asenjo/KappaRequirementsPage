import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import taskData from '../src/data/tasks.json';
import QuestTreePage from '../src/pages/QuestTreePage';
import { Task } from '../src/types';
import { buildQuestTree, flattenQuestTree, getQuestStatus, getValidCompletedTaskIds } from '../src/utils/questTree';

const tasks = taskData.tasks as Task[];
const tree = buildQuestTree(tasks);

assert.equal(tree.length > 0, true, 'quest tree should include trader groups');
assert.equal(
  tree.reduce((total, trader) => total + trader.totalTasks, 0),
  tasks.length,
  'tree groups should account for every task'
);
assert.equal(
  tree.every((trader) => flattenQuestTree(trader.roots).length > 0),
  true,
  'each trader should expose visible nodes'
);

const chainTasks: Task[] = [
  { id: 'a', title: 'A', trader: 'Prapor', levelRequirement: 1, objectives: [], countsForKappa: true },
  { id: 'b', title: 'B', trader: 'Prapor', levelRequirement: 1, prerequisites: ['A'], objectives: [], countsForKappa: true },
  { id: 'c', title: 'C', trader: 'Prapor', levelRequirement: 10, prerequisites: ['B'], objectives: [], countsForKappa: true },
];

assert.deepEqual(
  getValidCompletedTaskIds(chainTasks, ['c'], 79),
  [],
  'descendants cannot be completed without their prerequisite chain'
);
assert.deepEqual(
  getValidCompletedTaskIds(chainTasks, ['a', 'b', 'c'], 5),
  ['a', 'b'],
  'level-gated quests should not count as completed until the player level is high enough'
);

const chainTasksById = new Map(chainTasks.flatMap((task) => [
  [task.id, task],
  [task.title.toLowerCase(), task],
]));
assert.equal(
  getQuestStatus(chainTasks[2], ['a', 'b', 'c'], chainTasksById, 5),
  'completed',
  'imported completed quests should stay completed even when the current PMC level is lower'
);

const html = renderToString(
  <StaticRouter location="/quest-tree">
    <QuestTreePage tasks={tasks} />
  </StaticRouter>
);

assert.match(html, /Arbol de misiones/, 'quest tree page should render its title');
assert.match(html, /scroll-container-Prapor/, 'quest tree page should render trader sections');
assert.match(html, /Leyenda de estados/, 'quest tree page should render the status legend');

console.log('Quest tree tests passed');
