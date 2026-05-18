import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import QuestListPage from './pages/QuestListPage';
import QuestDetailPage from './pages/QuestDetailPage';
import QuestTreePage from './pages/QuestTreePage';
import AchievementsPage from './pages/AchievementsPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { Task } from './types';
import taskData from './data/tasks.json';
import useGoals from './hooks/useGoals';

const allTasks = taskData.tasks as Task[];

/**
 * Root component. Bundles task data from src/data/tasks.json and sets up the
 * application layout. The JSON file can be refreshed with `npm run update:tasks`.
 */
const App: React.FC = () => {
  const { goals, activeGoal, activeTasks, goalProgress, setActiveGoalId } = useGoals(allTasks);

  return (
    <div className="app-shell d-flex flex-column">
      {/* Header at the top */}
      <Header
        tasks={activeTasks}
        goals={goals}
        activeGoal={activeGoal}
        goalProgress={goalProgress}
        onGoalChange={setActiveGoalId}
      />
      <div className="app-body d-flex flex-column flex-md-row flex-grow-1 overflow-hidden">
        {/* Sidebar on the left */}
        <Sidebar tasks={activeTasks} />
        {/* Main content area */}
        <main className="app-main flex-grow-1 overflow-auto p-3">
          <Routes>
            <Route path="/" element={<Home tasks={activeTasks} goal={activeGoal} goalProgress={goalProgress} />} />
            <Route path="/quest-tree" element={<QuestTreePage tasks={activeTasks} />} />
            <Route path="/achievements" element={<AchievementsPage tasks={allTasks} onGoalChange={setActiveGoalId} />} />
            <Route
              path="/trader/:traderName"
              element={<QuestListPage tasks={activeTasks} />}
            />
            <Route
              path="/task/:taskId"
              element={<QuestDetailPage tasks={activeTasks} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
