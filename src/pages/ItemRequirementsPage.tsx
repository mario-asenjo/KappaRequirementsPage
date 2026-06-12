import React, { useMemo, useState } from 'react';
import itemRequirementData from '../data/itemRequirements.json';
import useLocalStorage from '../hooks/useLocalStorage';
import {
  calculateItemRequirementSummary,
  defaultItemPlannerPreferences,
  normalizeItemPlannerPreferences,
  searchItemRequirements,
  setAllRequirementInclusions,
  setRequirementInclusion,
} from '../utils/itemRequirements';
import {
  ItemPlannerPreferences,
  ItemRequirementEntry,
  ItemRequirementIndexEntry,
  ItemRequirementIndexFile,
} from '../types/itemPlanner';

const index = itemRequirementData as ItemRequirementIndexFile;
const preferenceStorageKey = 'kappa-item-planner-v1';
const formatter = new Intl.NumberFormat('es-ES');

const getSafeExternalUrl = (url: string | undefined) => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

const getItemSearchText = (item: ItemRequirementIndexEntry) => [item.name, item.shortName, item.normalizedName]
  .filter(Boolean)
  .join(' ');

const RequirementRow: React.FC<{
  itemId: string;
  requirement: ItemRequirementEntry & { included: boolean };
  onToggle: (requirementId: string, included: boolean) => void;
}> = ({ itemId, requirement, onToggle }) => {
  const checkboxId = `requirement-${itemId}-${requirement.id}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  const sourceUrl = getSafeExternalUrl(requirement.sourceUrl);
  return (
    <article className={`item-requirement-row${requirement.included ? '' : ' item-requirement-row--excluded'}`}>
      <label className="item-requirement-check" htmlFor={checkboxId}>
        <input
          id={checkboxId}
          type="checkbox"
          checked={requirement.included}
          onChange={(event) => onToggle(requirement.id, event.target.checked)}
        />
        <span>{requirement.included ? 'Incluido' : 'Excluido'}</span>
      </label>
      <div className="item-requirement-main">
        <div className="item-requirement-titleline">
          <h3>{requirement.label}</h3>
          <strong className="item-quantity-badge">x{formatter.format(requirement.quantity)}</strong>
        </div>
        {requirement.description && <p>{requirement.description}</p>}
        <div className="item-requirement-meta">
          {requirement.kind === 'quest' && <span>{requirement.trader}</span>}
          {requirement.kind === 'hideout' && requirement.stationName && (
            <span>{requirement.stationName} nivel {requirement.level}</span>
          )}
          {requirement.kind === 'quest' && requirement.kappaRequired && <span>Kappa</span>}
          {requirement.kind === 'quest' && requirement.lightkeeperRequired && <span>Lightkeeper</span>}
          {requirement.kind === 'quest' && requirement.objectiveType && <span>{requirement.objectiveType}</span>}
          {!requirement.countsTowardTotal && <span>No suma al total</span>}
          {requirement.foundInRaid && <span>FIR</span>}
          {requirement.optional && <span>Opcional</span>}
        </div>
        {requirement.kind === 'hideout' && requirement.prerequisites && requirement.prerequisites.length > 0 && (
          <p className="item-prerequisites">
            Prerequisitos: {requirement.prerequisites.map((prerequisite) => `${prerequisite.stationName} ${prerequisite.level}`).join(', ')}
          </p>
        )}
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="item-source-link">
            Ver fuente
          </a>
        )}
      </div>
    </article>
  );
};

const ItemRequirementsPage: React.FC = () => {
  const [query, setQuery] = useState('Toolset');
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(() => (
    index.items.find((item) => item.name === 'Toolset')?.id
  ));
  const [storedPreferences, setStoredPreferences] = useLocalStorage<Partial<ItemPlannerPreferences>>(
    preferenceStorageKey,
    defaultItemPlannerPreferences,
  );

  const preferences = useMemo(() => normalizeItemPlannerPreferences(storedPreferences), [storedPreferences]);
  const results = useMemo(() => searchItemRequirements(index.items, query, 30), [query]);
  const selectedItem = useMemo(() => {
    if (selectedItemId) return index.items.find((item) => item.id === selectedItemId) ?? results[0] ?? null;
    return results[0] ?? null;
  }, [results, selectedItemId]);

  const summary = useMemo(() => (
    selectedItem ? calculateItemRequirementSummary(selectedItem, preferences) : null
  ), [preferences, selectedItem]);

  const questRows = summary?.rows.filter((row) => row.kind === 'quest') ?? [];
  const hideoutRows = summary?.rows.filter((row) => row.kind === 'hideout') ?? [];

  const toggleRequirement = (requirementId: string, included: boolean) => {
    if (!selectedItem) return;
    setStoredPreferences((current) => setRequirementInclusion(
      selectedItem.id,
      requirementId,
      included,
      normalizeItemPlannerPreferences(current),
    ));
  };

  const setAll = (included: boolean) => {
    if (!selectedItem) return;
    setStoredPreferences((current) => setAllRequirementInclusions(
      selectedItem,
      included,
      normalizeItemPlannerPreferences(current),
    ));
  };

  return (
    <section className="item-planner-page">
      <div className="item-planner-hero">
        <div>
          <span className="eyebrow">Items · quests · hideout</span>
          <h1>Calculadora de items necesarios</h1>
          <p>
            Busca cualquier item del juego y decide que misiones o mejoras del hideout quieres contar.
            El total sirve para saber cuanto guardar antes de vender el excedente.
          </p>
        </div>
        <div className="item-planner-source-card">
          <strong>{formatter.format(index.metadata.itemCount)}</strong>
          <span>items con requisitos</span>
          <small>{formatter.format(index.metadata.requirementCount)} requisitos desde tarkov.dev</small>
        </div>
      </div>

      <div className="item-planner-layout">
        <aside className="item-search-panel" aria-label="Buscar item">
          <label htmlFor="item-search">Buscar item</label>
          <input
            id="item-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedItemId(undefined);
            }}
            placeholder="Toolset, Gas analyzer, LEDX..."
          />
          <p className="item-search-hint">
            Se buscan todos los items con requisitos de quests o hideout. Toolset es solo el ejemplo canario.
          </p>
          <div className="item-result-list" aria-label="Resultados de items">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`item-result${selectedItem?.id === item.id ? ' active' : ''}`}
                onClick={() => setSelectedItemId(item.id)}
              >
                {getSafeExternalUrl(item.iconLink) && <img src={getSafeExternalUrl(item.iconLink)} alt="" loading="lazy" />}
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.shortName || 'Sin short name'} · {item.requirements.length} usos</small>
                </span>
              </button>
            ))}
            {query.trim() && results.length === 0 && (
              <div className="item-empty-state">No hay items con requisitos que coincidan con “{query}”.</div>
            )}
          </div>
        </aside>

        <div className="item-planner-results">
          {selectedItem && summary ? (
            <>
              <div className="selected-item-card">
                <div className="selected-item-identity">
                  {getSafeExternalUrl(selectedItem.iconLink) && <img src={getSafeExternalUrl(selectedItem.iconLink)} alt="" />}
                  <div>
                    <span className="eyebrow">Item seleccionado</span>
                    <h2>{selectedItem.name}</h2>
                    <p>{getItemSearchText(selectedItem)}</p>
                  </div>
                </div>
                <div className="selected-item-actions">
                  {getSafeExternalUrl(selectedItem.wikiLink) && <a className="btn btn-outline-light btn-sm" href={getSafeExternalUrl(selectedItem.wikiLink)} target="_blank" rel="noreferrer">Wiki</a>}
                  <button className="btn btn-outline-light btn-sm" type="button" onClick={() => setAll(true)}>Seleccionar todo</button>
                  <button className="btn btn-outline-warning btn-sm" type="button" onClick={() => setAll(false)}>Deseleccionar todo</button>
                </div>
              </div>

              <div className="item-summary-grid" aria-label="Resumen de cantidades">
                <div className="item-summary-card item-summary-card--primary">
                  <span>Total a guardar</span>
                  <strong>{formatter.format(summary.totalRequired)}</strong>
                  <small>{summary.includedRows.length}/{summary.rows.length} requisitos incluidos</small>
                </div>
                <div className="item-summary-card">
                  <span>Misiones</span>
                  <strong>{formatter.format(summary.questRequired)}</strong>
                  <small>{questRows.length} filas</small>
                </div>
                <div className="item-summary-card">
                  <span>Hideout</span>
                  <strong>{formatter.format(summary.hideoutRequired)}</strong>
                  <small>{hideoutRows.length} mejoras</small>
                </div>
                <div className="item-summary-card">
                  <span>Excluidos</span>
                  <strong>{formatter.format(summary.excludedQuantity)}</strong>
                  <small>cantidad descontada</small>
                </div>
              </div>

              <div className="requirement-section-grid">
                <section className="requirement-section">
                  <div className="requirement-section-heading">
                    <span className="eyebrow">Quests</span>
                    <h2>Misiones que lo requieren</h2>
                  </div>
                  {questRows.length > 0 ? questRows.map((requirement) => (
                    <RequirementRow
                      key={requirement.id}
                      itemId={selectedItem.id}
                      requirement={requirement}
                      onToggle={toggleRequirement}
                    />
                  )) : <p className="item-empty-state">Este item no aparece en requisitos de misiones.</p>}
                </section>

                <section className="requirement-section">
                  <div className="requirement-section-heading">
                    <span className="eyebrow">Hideout</span>
                    <h2>Mejoras que lo requieren</h2>
                  </div>
                  {hideoutRows.length > 0 ? hideoutRows.map((requirement) => (
                    <RequirementRow
                      key={requirement.id}
                      itemId={selectedItem.id}
                      requirement={requirement}
                      onToggle={toggleRequirement}
                    />
                  )) : <p className="item-empty-state">Este item no aparece en mejoras del hideout.</p>}
                </section>
              </div>
            </>
          ) : (
            <div className="item-empty-panel">
              <h2>Busca un item para empezar</h2>
              <p>El panel cubre todos los items con requisitos detectados en tarkov.dev.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ItemRequirementsPage;
