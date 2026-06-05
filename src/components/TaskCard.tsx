import React from 'react';
import { Link } from 'react-router-dom';
import useProgress from '../hooks/useProgress';
import { Task } from '../types';
import { getCompletionIdsWithPrerequisites, getTaskPrerequisiteChain } from '../utils/taskPrerequisites';

interface TaskCardProps {
  task: Task;
  tasks?: Task[];
  position?: number;
  status?: 'completed' | 'available' | 'locked';
}

/**
 * Displays a concise view of a task with controls to mark it as complete or
 * incomplete. The task title links to a detailed view. The completion state
 * is persisted in localStorage using the custom hook. Styling is kept
 * minimal using Bootstrap utility classes.
 */
const TaskCard: React.FC<TaskCardProps> = ({ task, tasks = [task], position, status }) => {
  const { completedTaskIds, setCompletedTaskIds } = useProgress();

  const isCompleted = completedTaskIds.includes(task.id);
  const missingPrerequisiteCount = getTaskPrerequisiteChain(task, tasks)
    .filter((prerequisite) => !completedTaskIds.includes(prerequisite.id)).length;

  const toggleCompletion = () => {
    setCompletedTaskIds((prev) => {
      if (prev.includes(task.id)) {
        return prev.filter((id) => id !== task.id);
      } else {
        return getCompletionIdsWithPrerequisites(task, tasks, prev);
      }
    });
  };

  return (
    <div className={`task-card card mb-3 ${isCompleted ? 'is-completed' : ''}`}> 
      <div className="card-body d-flex flex-column flex-sm-row gap-3 justify-content-between align-items-start">
        <div className="task-card-content">
          <div className="task-card-badges">
            {position !== undefined && <span className="task-order">#{position}</span>}
            {status && (
              <span className={`task-status task-status--${status}`}>
                {status === 'available' ? 'Disponible' : status === 'locked' ? 'Bloqueada' : 'Completada'}
              </span>
            )}
            {task.levelRequirement && <span className="task-level">Nivel {task.levelRequirement}</span>}
            {task.lightkeeperRequired && <span className="task-flag task-flag--lightkeeper">LK</span>}
            {task.countsForKappa && <span className="task-flag task-flag--kappa">Kappa</span>}
          </div>
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
            {missingPrerequisiteCount > 0 ? ` · marcara ${missingPrerequisiteCount} prerequisitos` : ''}
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
