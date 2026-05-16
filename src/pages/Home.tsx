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
  const totalCompleted = tasks.filter((task) => completedIds.includes(task.id)).length;
  const totalProgress = tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;

  return (
    <div className="container-fluid">
      <section className="hero-panel mb-4">
        <span className="eyebrow">Kappa mission control</span>
        <h1>Tu ruta hacia Kappa, limpia y medible.</h1>
        <p>
          Sigue el avance por comerciante, filtra pendientes y conserva el progreso
          localmente sin cuentas ni credenciales.
        </p>
        <div className="hero-stats">
          <span><strong>{totalCompleted}</strong> completadas</span>
          <span><strong>{tasks.length}</strong> misiones Kappa</span>
          <span><strong>{totalProgress}%</strong> progreso global</span>
        </div>
      </section>
      <h2 className="section-title mb-4">Resumen por comerciante</h2>
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
              <div className="trader-card card h-100">
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
