import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import QuestListPage from './pages/QuestListPage';
import QuestDetailPage from './pages/QuestDetailPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { Task } from './types';

/**
 * Root component. Loads task data from a JSON file and sets up application
 * layout. Displays a sidebar, header, and the routed content. The JSON file
 * resides in the src/data directory and can be updated by running the provided
 * fetch script. This component also handles a loading state while the tasks
 * are being fetched.
 */
const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch task data from the bundled JSON file. The fetch API will load
    // `/data/tasks.json` relative to the base URL. If the file is missing or
    // malformed this will error, so errors are logged to the console.
    fetch('/src/data/tasks.json')
      .then(async (res) => {
        const data = await res.json();
        // Support both { tasks: [...] } and direct array in the JSON file
        const loadedTasks: Task[] = Array.isArray(data) ? data : data.tasks;
        setTasks(loadedTasks);
      })
      .catch((err) => {
        console.error('Failed to load tasks:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-3">Cargando misiones...</div>;
  }

  return (
    <div className="d-flex flex-column" style={{ height: '100vh' }}>
      {/* Header at the top */}
      <Header tasks={tasks} />
      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* Sidebar on the left */}
        <Sidebar tasks={tasks} />
        {/* Main content area */}
        <main className="flex-grow-1 overflow-auto p-3">
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
