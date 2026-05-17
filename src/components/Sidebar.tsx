import React from 'react';
import { NavLink } from 'react-router-dom';
import useProgress from '../hooks/useProgress';
import { Task } from '../types';

interface SidebarProps {
  tasks: Task[];
}

/**
 * Sidebar lists all traders for whom tasks exist. For each trader it also
 * displays a small badge showing how many of their tasks are completed. The
 * links use NavLink to automatically apply an active class when the route
 * matches. On small screens the sidebar collapses into a vertical list.
 */
const Sidebar: React.FC<SidebarProps> = ({ tasks }) => {
  const { completedTaskIds } = useProgress();

  // Derive a sorted list of unique trader names from the tasks
  const traders = Array.from(new Set(tasks.map((t) => t.trader))).sort();

  return (
    <nav
      className="app-sidebar bg-white border-end"
      aria-label="Comerciantes"
    >
      <div className="list-group list-group-flush">
        {traders.map((trader) => {
          const traderTasks = tasks.filter((t) => t.trader === trader);
          const completedForTrader = traderTasks.filter((t) =>
            completedTaskIds.includes(t.id)
          ).length;
          return (
            <NavLink
              key={trader}
              to={`/trader/${encodeURIComponent(trader)}`}
              className={({ isActive }) =>
                `trader-link list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                  isActive ? 'active' : ''
                }`
              }
            >
              <span>{trader}</span>
              <span className="badge trader-badge">
                {completedForTrader}/{traderTasks.length}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default Sidebar;
