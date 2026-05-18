import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import achievementData from '../data/achievements.json';
import goalData from '../data/goals.json';
import useProgress from '../hooks/useProgress';
import { Achievement, Goal, Task } from '../types';
import { getGoalProgress, getGoalTasks } from '../utils/progress';

interface AchievementsPageProps {
  tasks: Task[];
  onGoalChange: (goalId: string) => void;
}

const achievements = achievementData.achievements as Achievement[];
const goals = goalData.goals as Goal[];

const rarityOrder = ['Common', 'Rare', 'Legendary'];

const getAchievementGoal = (achievementId: string) =>
  goals.find((goal) => goal.achievementIds.includes(achievementId));

const AchievementsPage: React.FC<AchievementsPageProps> = ({ tasks, onGoalChange }) => {
  const { progress, completedAchievementIds, manualAchievementProgress, setManualAchievementProgress } = useProgress();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredAchievements = achievements
    .filter((achievement) => {
      const goal = getAchievementGoal(achievement.id);
      const taskCount = goal ? getGoalTasks(goal, tasks).length : 0;
      const isCompleted = completedAchievementIds.includes(achievement.id) || manualAchievementProgress[achievement.id];
      const matchesSearch = `${achievement.name} ${achievement.description ?? ''}`.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (filter === 'quest-linked') return taskCount > 0;
      if (filter === 'manual') return taskCount === 0;
      if (filter === 'completed') return Boolean(isCompleted);
      return true;
    })
    .sort((a, b) => rarityOrder.indexOf(b.rarity ?? '') - rarityOrder.indexOf(a.rarity ?? '') || a.name.localeCompare(b.name));

  return (
    <div className="achievements-page container-fluid">
      <section className="hero-panel achievements-hero mb-4">
        <div>
          <span className="eyebrow">Achievements</span>
          <h1>Logros y objetivos secundarios</h1>
          <p>
            Consulta los achievements sincronizados desde tarkov.dev y la wiki. Los logros sin misiones asociadas se pueden llevar como checklist manual.
          </p>
        </div>
        <div className="hero-stats">
          <span><strong>{achievements.length}</strong> achievements</span>
          <span><strong>{filteredAchievements.length}</strong> visibles</span>
          <span><strong>{achievements.filter((achievement) => getAchievementGoal(achievement.id)?.taskIds.length).length}</strong> con quests</span>
        </div>
      </section>

      <section className="filter-panel achievements-filters mb-4" aria-label="Filtros de achievements">
        <input
          className="form-control"
          type="search"
          placeholder="Buscar achievement..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="form-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">Todos</option>
          <option value="quest-linked">Con quests</option>
          <option value="manual">Manual</option>
          <option value="completed">Completados</option>
        </select>
      </section>

      <div className="achievements-grid">
        {filteredAchievements.map((achievement) => {
          const goal = getAchievementGoal(achievement.id);
          const relatedTasks = goal ? getGoalTasks(goal, tasks) : [];
          const progressForGoal = goal ? getGoalProgress(goal, progress, tasks) : undefined;
          const isManualComplete = Boolean(manualAchievementProgress[achievement.id]);
          const isAchievementComplete = completedAchievementIds.includes(achievement.id) || isManualComplete;

          return (
            <article key={achievement.id} className={`achievement-card is-${achievement.rarity?.toLowerCase() ?? 'unknown'}`}>
              <div className="achievement-card-header">
                {achievement.imageLink && <img src={achievement.imageLink} alt="" loading="lazy" />}
                <div>
                  <span className="achievement-rarity">{achievement.rarity ?? 'Unknown'}</span>
                  <h2>{achievement.name}</h2>
                </div>
              </div>
              <p>{achievement.description}</p>
              <div className="achievement-meta">
                <span>{achievement.hidden ? 'Oculto' : 'Visible'}</span>
                {achievement.playersCompletedPercent !== undefined && (
                  <span>{achievement.playersCompletedPercent}% jugadores</span>
                )}
                {achievement.wiki?.section && <span>{achievement.wiki.section}</span>}
              </div>
              {relatedTasks.length > 0 ? (
                <div className="achievement-progress">
                  <div className="progress" aria-label={`Progreso de ${achievement.name}`}>
                    <div className="progress-bar" style={{ width: `${progressForGoal?.percent ?? 0}%` }}></div>
                  </div>
                  <span>{progressForGoal?.completedTasks ?? 0}/{relatedTasks.length} quests</span>
                </div>
              ) : (
                <label className="achievement-manual-check">
                  <input
                    type="checkbox"
                    checked={isAchievementComplete}
                    onChange={(event) => setManualAchievementProgress(achievement.id, event.target.checked)}
                  />
                  Marcar achievement manual
                </label>
              )}
              <div className="achievement-actions">
                {goal && relatedTasks.length > 0 && (
                  <button className="btn btn-primary btn-sm" type="button" onClick={() => onGoalChange(goal.id)}>
                    Usar como objetivo
                  </button>
                )}
                {relatedTasks[0] && (
                  <Link className="btn btn-outline-secondary btn-sm" to={`/task/${encodeURIComponent(relatedTasks[0].id)}`}>
                    Primera quest
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsPage;
