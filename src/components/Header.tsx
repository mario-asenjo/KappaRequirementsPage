import React from 'react';
import { NavLink } from 'react-router-dom';
import useProgress from '../hooks/useProgress';
import { Goal, Task } from '../types';

interface HeaderProps {
  tasks: Task[];
  goals: Goal[];
  activeGoal?: Goal;
  goalProgress: {
    completed: number;
    total: number;
    percent: number;
  };
  onGoalChange: (goalId: string) => void;
}

/**
 * Header component displays the overall quest progress towards the Kappa
 * container. It reads the list of completed tasks from localStorage and
 * computes how many tasks that count for Kappa have been finished. A
 * progress bar with a label gives users an at‑a‑glance view of their
 * journey.
 */
const Header: React.FC<HeaderProps> = ({ tasks, goals, activeGoal, goalProgress, onGoalChange }) => {
  const { completedTaskIds } = useProgress();

  const completedTasks = tasks.filter((task) => completedTaskIds.includes(task.id)).length;
  const progressPercent = goalProgress.percent;

  return (
    <header className="app-header navbar px-3 gap-3">
      <NavLink to="/" className="navbar-brand mb-0 h1">Kappa Progress Tracker</NavLink>
      <nav className="header-nav" aria-label="Navegacion principal">
        <NavLink to="/" end>Panel</NavLink>
        <NavLink to="/tasks">Misiones</NavLink>
        <NavLink to="/quest-tree">Arbol</NavLink>
        <NavLink to="/maps">Mapas</NavLink>
        <NavLink to="/items">Items</NavLink>
        <NavLink to="/achievements">Achievements</NavLink>
        <NavLink
          to="/import"
          className={({ isActive }) => `nav-import-cta${isActive ? ' active' : ''}`}
        >
          Importar logs
        </NavLink>
        <a href="https://github.com/mario-asenjo/KappaRequirementsPage" target="_blank" rel="noreferrer">Star GitHub</a>
      </nav>
      <label className="goal-selector">
        <span>Objetivo</span>
        <select value={activeGoal?.id ?? ''} onChange={(event) => onGoalChange(event.target.value)}>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>{goal.name}</option>
          ))}
        </select>
      </label>
      <div className="kappa-progress flex-grow-1">
        <div className="progress" style={{ height: '1rem' }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${progressPercent}%` }}
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {progressPercent}%
          </div>
        </div>
        <small className="kappa-progress-label">
          {completedTasks} de {tasks.length} misiones de {activeGoal?.name ?? 'objetivo'} completadas
        </small>
      </div>
    </header>
  );
};

export default Header;
