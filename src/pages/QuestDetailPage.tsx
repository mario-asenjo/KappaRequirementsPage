import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import useProgress from '../hooks/useProgress';
import { Task } from '../types';
import { getCompletionIdsWithPrerequisites, getTaskPrerequisiteChain } from '../utils/taskPrerequisites';

interface QuestDetailPageProps {
  tasks: Task[];
  taskCatalog?: Task[];
}

/**
 * Detailed view for a single task. Shows description, objectives, prerequisites
 * and rewards. Users can mark the task as complete or incomplete, which
 * persists via localStorage. If the task ID is invalid, the user is
 * redirected back to the home page.
 */
const QuestDetailPage: React.FC<QuestDetailPageProps> = ({ tasks, taskCatalog = tasks }) => {
  const { taskId } = useParams();
  const id = decodeURIComponent(taskId ?? '');
  const task = tasks.find((t) => t.id === id);
  const { completedTaskIds, setCompletedTaskIds } = useProgress();

  if (!task) {
    // If the task is not found redirect to home
    return <Navigate to="/" replace />;
  }

  const isCompleted = completedTaskIds.includes(task.id);
  const missingPrerequisites = getTaskPrerequisiteChain(task, taskCatalog)
    .filter((prerequisite) => !completedTaskIds.includes(prerequisite.id));
  const toggleCompletion = () => {
    setCompletedTaskIds((prev) => {
      if (prev.includes(task.id)) {
        return prev.filter((t) => t !== task.id);
      }
      return getCompletionIdsWithPrerequisites(task, taskCatalog, prev);
    });
  };

  return (
    <div className="container-fluid">
      <div className="page-heading mb-3 d-flex flex-column flex-sm-row align-items-sm-center gap-2">
        <Link to={`/trader/${encodeURIComponent(task.trader)}`} className="btn btn-link me-3">
          ← Volver a {task.trader}
        </Link>
        <h2 className="mb-0">{task.title}</h2>
      </div>
      {task.description && (
        <p className="detail-lead lead">{task.description}</p>
      )}
      <div className="detail-panel mb-3">
        <h5>Objetivos</h5>
        <ul>
          {task.objectives.map((obj, idx) => (
            <li key={idx}>{obj}</li>
          ))}
        </ul>
      </div>
      {task.prerequisites && task.prerequisites.length > 0 && (
        <div className="detail-panel mb-3">
          <h5>Prerrequisitos</h5>
          <ul>
            {task.prerequisites.map((pre, idx) => (
              <li key={idx}>{pre}</li>
            ))}
          </ul>
        </div>
      )}
      {task.rewards && (
        <div className="detail-panel mb-3">
          <h5>Recompensas</h5>
          <p>{task.rewards}</p>
        </div>
      )}
      {!isCompleted && missingPrerequisites.length > 0 && (
        <div className="detail-panel detail-panel--chain mb-3">
          <h5>Cadena real que se marcara</h5>
          <p>
            Al completar esta mision tambien se marcaran {missingPrerequisites.length} prerequisitos conectados por la API.
          </p>
          <ul>
            {missingPrerequisites.map((prerequisite) => (
              <li key={prerequisite.id}>{prerequisite.title} ({prerequisite.trader})</li>
            ))}
          </ul>
        </div>
      )}
      <button
        className={`btn ${isCompleted ? 'btn-success' : 'btn-outline-secondary'}`}
        onClick={toggleCompletion}
      >
        {isCompleted ? 'Completada' : missingPrerequisites.length > 0 ? 'Marcar cadena completada' : 'Marcar como completada'}
      </button>
    </div>
  );
};

export default QuestDetailPage;
