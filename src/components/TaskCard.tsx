import React from 'react';
import { Link } from 'react-router-dom';
import useLocalStorage from '../hooks/useLocalStorage';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
}

/**
 * Displays a concise view of a task with controls to mark it as complete or
 * incomplete. The task title links to a detailed view. The completion state
 * is persisted in localStorage using the custom hook. Styling is kept
 * minimal using Bootstrap utility classes.
 */
const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const [completedIds, setCompletedIds] = useLocalStorage<string[]>('completedTasks', []);

  const isCompleted = completedIds.includes(task.id);

  const toggleCompletion = () => {
    setCompletedIds((prev) => {
      if (prev.includes(task.id)) {
        return prev.filter((id) => id !== task.id);
      } else {
        return [...prev, task.id];
      }
    });
  };

  return (
    <div className={`card mb-3 ${isCompleted ? 'border-success' : ''}`}> 
      <div className="card-body d-flex justify-content-between align-items-start">
        <div>
          <h5 className="card-title mb-1">
            <Link to={`/task/${encodeURIComponent(task.id)}`}>{task.title}</Link>
          </h5>
          <p className="card-subtitle text-muted mb-2">{task.trader}</p>
          {task.location && (
            <small className="d-block mb-1">
              <strong>Mapa:</strong> {task.location}
            </small>
          )}
          <small className="text-muted">
            {task.objectives.length} objetivos
          </small>
        </div>
        <button
          className={`btn btn-sm ${isCompleted ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={toggleCompletion}
        >
          {isCompleted ? 'Completada' : 'Marcar'}
        </button>
      </div>
    </div>
  );
};

export default TaskCard;
