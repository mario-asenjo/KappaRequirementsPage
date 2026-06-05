import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import TaskCard from '../components/TaskCard';
import useProgress from '../hooks/useProgress';
import { Task } from '../types';
import { getQuestStatus } from '../utils/questTree';

interface QuestListPageProps {
  tasks: Task[];
  taskCatalog?: Task[];
}

/**
 * Displays a list of tasks for a specific trader. Users can search by
 * task title and choose whether to hide completed tasks. The tasks are
 * displayed using the TaskCard component.
 */
const QuestListPage: React.FC<QuestListPageProps> = ({ tasks, taskCatalog = tasks }) => {
  const { traderName } = useParams();
  const trader = traderName ? decodeURIComponent(traderName) : '';
  const scopedTasks = trader ? tasks.filter((task) => task.trader === trader) : tasks;
  const { completedTaskIds, playerLevel, setPlayerLevel } = useProgress();
  const [search, setSearch] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [nextOnly, setNextOnly] = useState(false);
  const [levelFilter, setLevelFilter] = useState(false);
  const [groupBy, setGroupBy] = useState<'trader' | 'map'>('trader');
  const [sortBy, setSortBy] = useState<'name' | 'level-asc' | 'level-desc' | 'incomplete-first' | 'available-first'>('available-first');
  const completedForScope = scopedTasks.filter((task) => completedTaskIds.includes(task.id)).length;
  const scopeProgress = scopedTasks.length > 0
    ? Math.round((completedForScope / scopedTasks.length) * 100)
    : 0;
  const tasksByNameOrId = useMemo(() => {
    const index = new Map<string, Task>();
    taskCatalog.forEach((task) => {
      index.set(task.id.trim().toLowerCase(), task);
      index.set(task.title.trim().toLowerCase(), task);
    });
    return index;
  }, [taskCatalog]);

  const getStatus = (task: Task) => getQuestStatus(task, completedTaskIds, tasksByNameOrId, playerLevel);
  const filtered = scopedTasks.filter((task) => {
    const normalizedSearch = search.toLowerCase().trim();
    const matchesSearch = !normalizedSearch
      || task.title.toLowerCase().includes(normalizedSearch)
      || task.trader.toLowerCase().includes(normalizedSearch)
      || (task.location ?? '').toLowerCase().includes(normalizedSearch);
    const isCompleted = completedTaskIds.includes(task.id);
    const status = getStatus(task);
    return matchesSearch
      && (showCompleted || !isCompleted)
      && (!nextOnly || status === 'available')
      && (!levelFilter || (task.levelRequirement ?? 1) <= playerLevel);
  });
  const sorted = [...filtered].sort((a, b) => {
    const completedA = completedTaskIds.includes(a.id);
    const completedB = completedTaskIds.includes(b.id);
    const statusA = getStatus(a);
    const statusB = getStatus(b);

    if (sortBy === 'level-asc') return (a.levelRequirement ?? 1) - (b.levelRequirement ?? 1) || a.title.localeCompare(b.title);
    if (sortBy === 'level-desc') return (b.levelRequirement ?? 1) - (a.levelRequirement ?? 1) || a.title.localeCompare(b.title);
    if (sortBy === 'incomplete-first' && completedA !== completedB) return completedA ? 1 : -1;
    if (sortBy === 'available-first' && statusA !== statusB) {
      const order = { available: 0, locked: 1, completed: 2 };
      return order[statusA] - order[statusB];
    }

    return a.title.localeCompare(b.title);
  });
  const groups = sorted.reduce<Record<string, Task[]>>((acc, task) => {
    const key = groupBy === 'map' ? task.location || 'Sin mapa especifico' : task.trader;
    acc[key] = acc[key] ?? [];
    acc[key].push(task);
    return acc;
  }, {});
  const groupEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  const handlePlayerLevelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerLevel(Math.min(79, Math.max(1, Number(event.target.value) || 1)));
  };

  return (
    <div className="quest-board-page container-fluid">
      <div className="page-heading d-flex flex-column flex-sm-row align-items-sm-center gap-2 mb-3">
          <div className="me-auto">
            <span className="eyebrow">Tablero avanzado</span>
            <h2 className="mb-1">{trader ? `Misiones de ${trader}` : 'Todas las misiones del objetivo'}</h2>
            <p className="page-subtitle mb-0">
              {completedForScope} de {scopedTasks.length} completadas ({scopeProgress}%). {filtered.length} visibles.
            </p>
          </div>
          <Link to="/" className="btn btn-link">← Volver</Link>
      </div>
      <div className="progress trader-page-progress mb-3" aria-label={trader ? `Progreso de ${trader}` : 'Progreso de todas las misiones'}>
        <div
          className="progress-bar"
          role="progressbar"
          style={{ width: `${scopeProgress}%` }}
          aria-valuenow={scopeProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>
      <div className="filter-panel quest-board-controls row g-2 mb-3">
        <div className="col-md-6 col-xl-3">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar mision, trader o mapa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-6 col-xl-2">
          <select className="form-select" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
            <option value="available-first">Disponibles primero</option>
            <option value="incomplete-first">Incompletas primero</option>
            <option value="name">Nombre A-Z</option>
            <option value="level-asc">Nivel bajo-alto</option>
            <option value="level-desc">Nivel alto-bajo</option>
          </select>
        </div>
        {!trader && (
          <div className="col-md-6 col-xl-2">
            <select className="form-select" value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)}>
              <option value="trader">Agrupar por trader</option>
              <option value="map">Agrupar por mapa</option>
            </select>
          </div>
        )}
        <div className="col-6 col-md-3 col-xl-1">
          <input
            type="number"
            className="form-control"
            aria-label="Nivel PMC"
            min="1"
            max="79"
            value={playerLevel}
            onChange={handlePlayerLevelChange}
          />
        </div>
        <label className="col-md-6 col-xl-auto quest-board-toggle">
          <input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} />
          Mostrar completadas
        </label>
        <label className="col-md-6 col-xl-auto quest-board-toggle">
          <input type="checkbox" checked={nextOnly} onChange={(event) => setNextOnly(event.target.checked)} />
          Solo disponibles
        </label>
        <label className="col-md-6 col-xl-auto quest-board-toggle">
          <input type="checkbox" checked={levelFilter} onChange={(event) => setLevelFilter(event.target.checked)} />
          Filtrar por nivel
        </label>
      </div>
      <div className="quest-board-summary mb-3" aria-label="Resumen de filtros">
        <span>{sorted.filter((task) => getStatus(task) === 'available').length} disponibles</span>
        <span>{sorted.filter((task) => getStatus(task) === 'locked').length} bloqueadas</span>
        <span>{sorted.filter((task) => completedTaskIds.includes(task.id)).length} completadas visibles</span>
        <span>Nivel PMC {playerLevel}</span>
      </div>
      {sorted.length === 0 ? (
        <p className="empty-state">No hay misiones que coincidan con tu busqueda.</p>
      ) : (
        <div className="quest-board-groups">
          {groupEntries.map(([groupName, groupTasks]) => {
            const completedForGroup = groupTasks.filter((task) => completedTaskIds.includes(task.id)).length;
            const progress = groupTasks.length > 0 ? Math.round((completedForGroup / groupTasks.length) * 100) : 0;
            return (
              <section key={groupName} className="quest-board-group">
                {!trader && (
                  <div className="quest-board-group-header">
                    <div>
                      <h3>{groupName}</h3>
                      <p>{completedForGroup}/{groupTasks.length} completadas</p>
                    </div>
                    <div className="progress" aria-label={`Progreso de ${groupName}`}>
                      <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )}
                {groupTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    tasks={taskCatalog}
                    position={scopedTasks.findIndex((candidate) => candidate.id === task.id) + 1}
                    status={getStatus(task)}
                  />
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuestListPage;
