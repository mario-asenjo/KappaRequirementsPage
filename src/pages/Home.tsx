import React from 'react';
import { Link } from 'react-router-dom';
import useProgress from '../hooks/useProgress';
import { Goal, Task } from '../types';

interface HomeProps {
  tasks: Task[];
  goal?: Goal;
  goalProgress: {
    percent: number;
  };
}

/**
 * The landing page of the application. It gives the user a high level
 * overview of progress for each trader and encourages navigation to view
 * individual tasks. Each trader card links to the corresponding list page.
 */
const Home: React.FC<HomeProps> = ({ tasks, goal, goalProgress }) => {
  const { completedTaskIds } = useProgress();

  // Group tasks by trader
  const traders = Array.from(new Set(tasks.map((t) => t.trader))).sort();
  const totalCompleted = tasks.filter((task) => completedTaskIds.includes(task.id)).length;
  const totalPending = tasks.length - totalCompleted;
  const totalProgress = goalProgress.percent;
  const nextPending = tasks.find((task) => !completedTaskIds.includes(task.id));

  return (
    <div className="container-fluid">
      <section className="hero-panel dashboard-panel mb-4">
        <div className="dashboard-copy">
          <span className="eyebrow">Mission control</span>
          <h1>Tu ruta hacia {goal?.name ?? 'Kappa'}, limpia y medible.</h1>
          <p>
            Sigue el avance por comerciante, filtra pendientes y conserva el progreso del objetivo activo
            localmente sin cuentas ni credenciales.
          </p>
          <div className="hero-stats" aria-label="Resumen global">
            <span><strong>{totalCompleted}</strong> completadas</span>
            <span><strong>{totalPending}</strong> pendientes</span>
            <span><strong>{tasks.length}</strong> misiones</span>
          </div>
        </div>
        <div className="dashboard-card" aria-label={`Progreso global hacia ${goal?.name ?? 'el objetivo activo'}`}>
          <span className="dashboard-label">Progreso {goal?.name ?? 'global'}</span>
          <strong>{totalProgress}%</strong>
          <div className="progress" aria-hidden="true">
            <div className="progress-bar" style={{ width: `${totalProgress}%` }}></div>
          </div>
          {nextPending ? (
            <Link className="next-task" to={`/task/${encodeURIComponent(nextPending.id)}`}>
              Siguiente: {nextPending.title}
            </Link>
          ) : (
            <span className="next-task is-done">Todas las misiones del objetivo estan completadas</span>
          )}
        </div>
      </section>
      <h2 className="section-title mb-4">Resumen por comerciante</h2>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
        {traders.map((trader) => {
          const traderTasks = tasks.filter((t) => t.trader === trader);
          const completedForTrader = traderTasks.filter((t) =>
            completedTaskIds.includes(t.id)
          ).length;
          const progress = traderTasks.length > 0 ? completedForTrader / traderTasks.length : 0;
          const progressPercent = Math.round(progress * 100);
          return (
            <div key={trader} className="col">
              <div className="trader-card card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="trader-card-header">
                    <h5 className="card-title">{trader}</h5>
                    <span>{progressPercent}%</span>
                  </div>
                  <p className="card-text flex-grow-1">
                    {completedForTrader} completadas, {traderTasks.length - completedForTrader} pendientes
                  </p>
                  <div className="progress mb-3" style={{ height: '0.55rem' }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{ width: `${progressPercent}%` }}
                      aria-valuenow={progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                  <Link className="btn btn-primary" to={`/trader/${encodeURIComponent(trader)}`}>Continuar ruta</Link>
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
