import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import QuestListPage from './pages/QuestListPage';
import QuestDetailPage from './pages/QuestDetailPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { Task } from './types';
import taskData from './data/tasks.json';

/**
 * Root component. Bundles task data from src/data/tasks.json and sets up the
 * application layout. The JSON file can be refreshed with `npm run update:tasks`.
 */
const App: React.FC = () => {
  const tasks = taskData.tasks as Task[];

  return (
    <div className="app-shell d-flex flex-column">
      {/* Header at the top */}
      <Header tasks={tasks} />
      <div className="app-body d-flex flex-column flex-md-row flex-grow-1 overflow-hidden">
        {/* Sidebar on the left */}
        <Sidebar tasks={tasks} />
        {/* Main content area */}
        <main className="app-main flex-grow-1 overflow-auto p-3">
          <Routes>
            <Route path="/" element={<Home tasks={tasks} />} />
            <Route
              path="/trader/:traderName"
              element={<QuestListPage tasks={tasks} />}
            />
            <Route
              path="/task/:taskId"
              element={<QuestDetailPage tasks={tasks} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
