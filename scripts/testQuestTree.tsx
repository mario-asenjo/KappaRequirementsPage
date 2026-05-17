import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import taskData from '../src/data/tasks.json';
import QuestTreePage from '../src/pages/QuestTreePage';
import { Task } from '../src/types';
import { buildQuestTree, flattenQuestTree } from '../src/utils/questTree';

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

const html = renderToString(
  <StaticRouter location="/quest-tree">
    <QuestTreePage tasks={tasks} />
  </StaticRouter>
);

assert.match(html, /Arbol de misiones Kappa/, 'quest tree page should render its title');
assert.match(html, /Comerciante/, 'quest tree page should render controls');

console.log('Quest tree tests passed');
