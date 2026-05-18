import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import AchievementsPage from '../src/pages/AchievementsPage';
import taskData from '../src/data/tasks.json';
import { Task } from '../src/types';

const html = renderToString(
  <StaticRouter location="/achievements">
    <AchievementsPage tasks={taskData.tasks as Task[]} onGoalChange={() => undefined} />
  </StaticRouter>
);

assert.match(html, /Logros y objetivos secundarios/, 'achievements page should render its title');
assert.match(html, /achievement-card/, 'achievements page should render cards');
assert.match(html, /Marcar achievement manual|Usar como objetivo/, 'achievements page should render actions');

console.log('Achievements page tests passed');
