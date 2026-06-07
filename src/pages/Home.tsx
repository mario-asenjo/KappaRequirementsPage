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
  const { completedTaskIds, progress } = useProgress();

  // Group tasks by trader
  const traders = Array.from(new Set(tasks.map((t) => t.trader))).sort();
  const activeTaskIds = new Set(tasks.map((task) => task.id));
  const totalCompleted = tasks.filter((task) => completedTaskIds.includes(task.id)).length;
  const totalPending = tasks.length - totalCompleted;
  const totalProgress = goalProgress.percent;
  const nextPending = tasks.find((task) => !completedTaskIds.includes(task.id));
  const detectedStarted = progress.startedTaskIds.filter((taskId) =>
    activeTaskIds.has(taskId) && !completedTaskIds.includes(taskId)
  ).length;
  const lastImport = progress.lastImport;
  const formattedLastImport = lastImport
    ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lastImport.importedAt))
    : null;
  const firstStartedTask = tasks.find((task) => progress.startedTaskIds.includes(task.id) && !completedTaskIds.includes(task.id));
  const routeCards = [
    {
      label: 'Paso 1',
      title: lastImport ? 'Revisar importacion' : 'Importar logs',
      description: lastImport
        ? `${lastImport.addedCompletedCount} completadas nuevas y ${lastImport.detectedStartedCount} iniciadas en el ultimo snapshot.`
        : 'Carga un snapshot local para transformar logs en progreso verificable antes de planificar.',
      metric: lastImport ? 'Snapshot listo' : 'Sin cuentas',
      to: '/import',
      cta: lastImport ? 'Ver estado' : 'Importar ahora',
    },
    {
      label: 'Paso 2',
      title: 'Desbloquear el arbol',
      description: 'Consulta dependencias visibles por comerciante y detecta que bloquea tu siguiente cadena.',
      metric: `${detectedStarted} iniciadas`,
      to: '/quest-tree',
      cta: 'Abrir arbol',
    },
    {
      label: 'Paso 3',
      title: firstStartedTask ? 'Continuar mision iniciada' : 'Elegir siguiente mision',
      description: firstStartedTask
        ? `${firstStartedTask.trader} · ${firstStartedTask.location ?? 'Mapa por definir'}`
        : 'Filtra por disponibles, nivel PMC y mapa para preparar la siguiente raid con menos ruido.',
      metric: firstStartedTask ? 'Detectada por logs' : `${totalPending} pendientes`,
      to: firstStartedTask ? `/task/${encodeURIComponent(firstStartedTask.id)}` : '/tasks',
      cta: firstStartedTask ? firstStartedTask.title : 'Ver tablero',
    },
  ];

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
            <span><strong>{detectedStarted}</strong> iniciadas por logs</span>
          </div>
          <div className="import-callout" aria-label="Importacion automatica desde logs locales">
            <div>
              <span className="import-callout-kicker">Diferencial KappaTracker</span>
              <h2>Importa tu progreso real desde los logs locales.</h2>
              <p>
                Descarga el extractor, genera un JSON de solo lectura y actualiza completadas e iniciadas sin cuentas,
                credenciales ni llamadas de red.
              </p>
              {lastImport ? (
                <p className="import-callout-status">
                  Ultima importacion: <strong>{formattedLastImport}</strong> · {lastImport.addedCompletedCount} nuevas ·{' '}
                  {lastImport.detectedStartedCount} iniciadas detectadas
                </p>
              ) : (
                <p className="import-callout-status">
                  Primer paso recomendado: generar tu snapshot local antes de planificar la siguiente raid.
                </p>
              )}
            </div>
            <div className="import-callout-actions">
              <Link className="btn btn-primary" to="/import">Importar desde logs</Link>
              <Link className="btn btn-outline-secondary" to="/import">Descargar extractor</Link>
            </div>
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

      <section className="mission-route-panel mb-4" aria-labelledby="mission-route-title">
        <div className="mission-route-heading">
          <div>
            <span className="eyebrow">Siguiente decision</span>
            <h2 id="mission-route-title">De los logs a la siguiente raid</h2>
          </div>
          <p>
            Un flujo de tres pasos para reducir friccion: importar, entender bloqueos y actuar sobre la mision correcta.
          </p>
        </div>
        <div className="mission-route-grid">
          {routeCards.map((card) => (
            <Link key={card.label} className="mission-route-card" to={card.to}>
              <span className="route-card-label">{card.label}</span>
              <strong>{card.title}</strong>
              <p>{card.description}</p>
              <span className="route-card-footer">
                <span>{card.metric}</span>
                <span>{card.cta} →</span>
              </span>
            </Link>
          ))}
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
