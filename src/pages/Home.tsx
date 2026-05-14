import React from 'react';
import { Link } from 'react-router-dom';
import useLocalStorage from '../hooks/useLocalStorage';
import { Task } from '../types';

interface HomeProps {
  tasks: Task[];
}

/**
 * The landing page of the application. It gives the user a high level
 * overview of progress for each trader and encourages navigation to view
 * individual tasks. Each trader card links to the corresponding list page.
 */
const Home: React.FC<HomeProps> = ({ tasks }) => {
  const [completedIds] = useLocalStorage<string[]>('completedTasks', []);

  // Group tasks by trader
  const traders = Array.from(new Set(tasks.map((t) => t.trader))).sort();

  return (
    <div className="container-fluid">
      <h2 className="mb-4">Resumen de Progreso por Comerciante</h2>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
        {traders.map((trader) => {
          const traderTasks = tasks.filter((t) => t.trader === trader);
          const completedForTrader = traderTasks.filter((t) =>
            completedIds.includes(t.id)
          ).length;
          const progress = traderTasks.length > 0 ? completedForTrader / traderTasks.length : 0;
          const progressPercent = Math.round(progress * 100);
          return (
            <div key={trader} className="col">
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{trader}</h5>
                  <p className="card-text flex-grow-1">
                    {completedForTrader} de {traderTasks.length} misiones completadas
                  </p>
                  <div className="progress mb-2" style={{ height: '0.5rem' }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{ width: `${progressPercent}%` }}
                      aria-valuenow={progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                  <Link className="btn btn-primary" to={`/trader/${encodeURIComponent(trader)}`}>Ver misiones</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Home;
