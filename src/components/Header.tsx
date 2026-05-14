import React from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Task } from '../types';

interface HeaderProps {
  tasks: Task[];
}

/**
 * Header component displays the overall quest progress towards the Kappa
 * container. It reads the list of completed tasks from localStorage and
 * computes how many tasks that count for Kappa have been finished. A
 * progress bar with a label gives users an at‑a‑glance view of their
 * journey.
 */
const Header: React.FC<HeaderProps> = ({ tasks }) => {
  // Retrieve a set of completed task IDs from localStorage. Default to an
  // empty array if nothing is stored yet.
  const [completedIds] = useLocalStorage<string[]>('completedTasks', []);

  // Calculate counts for tasks that count towards the Kappa container
  const totalKappaTasks = tasks.filter((t) => t.countsForKappa).length;
  const completedKappaTasks = tasks.filter(
    (t) => t.countsForKappa && completedIds.includes(t.id)
  ).length;
  const progress = totalKappaTasks > 0 ? completedKappaTasks / totalKappaTasks : 0;

  // Format as percentage with no decimals
  const progressPercent = Math.round(progress * 100);

  return (
    <header className="navbar navbar-dark bg-primary px-3 gap-3">
      <span className="navbar-brand mb-0 h1">Kappa Progress Tracker</span>
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
        <small className="text-light">
          {completedKappaTasks} de {totalKappaTasks} misiones de Kappa completadas
        </small>
      </div>
    </header>
  );
};

export default Header;
