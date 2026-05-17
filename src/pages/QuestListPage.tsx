import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import TaskCard from '../components/TaskCard';
import useProgress from '../hooks/useProgress';
import { Task } from '../types';

interface QuestListPageProps {
  tasks: Task[];
}

/**
 * Displays a list of tasks for a specific trader. Users can search by
 * task title and choose whether to hide completed tasks. The tasks are
 * displayed using the TaskCard component.
 */
const QuestListPage: React.FC<QuestListPageProps> = ({ tasks }) => {
  const { traderName } = useParams();
  const trader = decodeURIComponent(traderName ?? '');
  const traderTasks = tasks.filter((t) => t.trader === trader);
  const { completedTaskIds } = useProgress();
  const [search, setSearch] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const completedForTrader = traderTasks.filter((task) => completedTaskIds.includes(task.id)).length;
  const traderProgress = traderTasks.length > 0
    ? Math.round((completedForTrader / traderTasks.length) * 100)
    : 0;

  const filtered = traderTasks.filter((task) => {
    const matchesTitle = task.title.toLowerCase().includes(search.toLowerCase());
    const isCompleted = completedTaskIds.includes(task.id);
    return matchesTitle && (!hideCompleted || !isCompleted);
  });

  return (
    <div className="container-fluid">
      <div className="page-heading d-flex flex-column flex-sm-row align-items-sm-center gap-2 mb-3">
          <div className="me-auto">
            <span className="eyebrow">Ruta ordenada por aparicion</span>
            <h2 className="mb-1">Misiones de {trader}</h2>
            <p className="page-subtitle mb-0">
              {completedForTrader} de {traderTasks.length} completadas ({traderProgress}%).
            </p>
          </div>
          <Link to="/" className="btn btn-link">← Volver</Link>
      </div>
      <div className="progress trader-page-progress mb-3" aria-label={`Progreso de ${trader}`}>
        <div
          className="progress-bar"
          role="progressbar"
          style={{ width: `${traderProgress}%` }}
          aria-valuenow={traderProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>
      <div className="filter-panel row mb-3">
        <div className="col-md-6 col-lg-4 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar misión…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-6 col-lg-4 mb-2 d-flex align-items-center">
          <input
            type="checkbox"
            className="form-check-input me-2"
            id="hideCompleted"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
          />
          <label htmlFor="hideCompleted" className="form-check-label">
            Ocultar completadas
          </label>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="empty-state">No hay misiones que coincidan con tu busqueda.</p>
      ) : (
        filtered.map((task) => (
          <TaskCard key={task.id} task={task} position={traderTasks.indexOf(task) + 1} />
        ))
      )}
    </div>
  );
};

export default QuestListPage;
