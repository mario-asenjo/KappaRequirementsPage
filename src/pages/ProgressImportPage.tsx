import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useProgress from '../hooks/useProgress';
import { ProgressImportFileV2, ProgressImportProfile, Task } from '../types';
import {
  getDefaultImportProfile,
  getProgressImportPreview,
  parseProgressImportDocument,
  ProgressImportPreview,
  selectImportProfile,
} from '../utils/progressImport';
import { getCompletionIdsWithPrerequisites } from '../utils/taskPrerequisites';

interface ProgressImportPageProps {
  tasks: Task[];
}

const extractorDownloadPath = '/downloads/eft-log-importer.zip';
const extractorScriptPath = '/downloads/eft-log-importer.mjs';
const extractorCommand = 'node eft-log-importer.mjs --eft "C:\\Games\\EscapeFromTarkov" --out kappa-progress-import.json';

const MODE_LABEL: Record<ProgressImportProfile['mode'], string> = {
  pve: 'PvE',
  pvp: 'PvP',
  'seasonal-pvp': 'PvP Season',
  unknown: 'Modo desconocido',
};

/** The task catalog loaded by the app is PvE (src/data/tasks.json). */
const APP_CATALOG_MODE: ProgressImportProfile['mode'] = 'pve';

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const getTaskTitles = (ids: string[], tasksById: Map<string, Task>) =>
  ids.map((id) => tasksById.get(id)?.title ?? id);

const getImportedCompletionIds = (
  importedTaskIds: string[],
  tasks: Task[],
  tasksById: Map<string, Task>,
  currentCompletedTaskIds: string[]
) => {
  let next = currentCompletedTaskIds;
  importedTaskIds.forEach((id) => {
    const task = tasksById.get(id);
    if (!task) return;
    next = getCompletionIdsWithPrerequisites(task, tasks, next);
  });
  return next;
};

const ProgressImportPage: React.FC<ProgressImportPageProps> = ({ tasks }) => {
  const { completedTaskIds, progress, resetProgress, setProgress } = useProgress();
  const [preview, setPreview] = useState<ProgressImportPreview | null>(null);
  const [error, setError] = useState('');
  const [appliedCount, setAppliedCount] = useState<number | null>(null);
  const [resetMessage, setResetMessage] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [importDocument, setImportDocument] = useState<ProgressImportFileV2 | null>(null);
  const [selectedProfileKey, setSelectedProfileKey] = useState('');
  const [confirmOtherMode, setConfirmOtherMode] = useState(false);
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const newCompletedTitles = preview ? getTaskTitles(preview.newCompletedTaskIds.slice(0, 12), tasksById) : [];
  const startedTitles = preview ? getTaskTitles(preview.validStartedTaskIds.slice(0, 8), tasksById) : [];
  const failedTitles = preview ? getTaskTitles(preview.newFailedTaskIds.slice(0, 8), tasksById) : [];
  const selectedProfile = importDocument?.profiles.find((profile) => profile.profileKey === selectedProfileKey);
  const isOtherMode = Boolean(selectedProfile && selectedProfile.mode !== APP_CATALOG_MODE);
  const canApplyImport = Boolean(
    preview
    && (preview.newCompletedTaskIds.length > 0 || preview.validStartedTaskIds.length > 0)
    && (!isOtherMode || confirmOtherMode)
  );
  const lastImport = progress.lastImport;

  const readFile = async (file?: File) => {
    setError('');
    setAppliedCount(null);
    setPreview(null);
    setImportDocument(null);
    setSelectedProfileKey('');
    setConfirmOtherMode(false);
    setSelectedFileName(file?.name ?? '');

    if (!file) return;

    try {
      const parsed = parseProgressImportDocument(await file.text());
      if (parsed.schemaVersion === 1) {
        setPreview(getProgressImportPreview(parsed.file, tasks, completedTaskIds));
        return;
      }
      const profile = getDefaultImportProfile(parsed.document);
      setImportDocument(parsed.document);
      if (profile) chooseProfile(parsed.document, profile.profileKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo de importación.');
    }
  };

  const chooseProfile = (document: ProgressImportFileV2, profileKey: string) => {
    setSelectedProfileKey(profileKey);
    setConfirmOtherMode(false);
    setAppliedCount(null);
    setPreview(getProgressImportPreview(selectImportProfile(document, profileKey), tasks, completedTaskIds));
  };

  const applyImport = () => {
    if (!preview) return;

    const nextCompleted = getImportedCompletionIds(preview.newCompletedTaskIds, tasks, tasksById, progress.completedTaskIds);
    const nextCompletedSet = new Set(nextCompleted);
    const started = new Set(progress.startedTaskIds);
    preview.validStartedTaskIds.forEach((id) => {
      if (!nextCompletedSet.has(id)) started.add(id);
    });
    const addedCompletedCount = nextCompleted.length - progress.completedTaskIds.length;

    setProgress({
      ...progress,
      completedTaskIds: nextCompleted,
      startedTaskIds: Array.from(started).filter((id) => !nextCompletedSet.has(id)),
      lastImport: {
        source: preview.importFile.source,
        importedAt: new Date().toISOString(),
        generatedAt: preview.importFile.generatedAt,
        addedCompletedCount,
        detectedStartedCount: preview.validStartedTaskIds.length,
        failedMarkedCompletedCount: preview.newFailedTaskIds.length,
        unknownTaskCount: preview.unknownTaskIds.length,
        warningCount: preview.warnings.length,
        ...(selectedProfile ? { profileKey: selectedProfile.profileKey, mode: selectedProfile.mode } : {}),
      },
    });
    setAppliedCount(addedCompletedCount);
  };

  const handleResetProgress = () => {
    const confirmed = window.confirm('Esto borrará misiones, achievements manuales y nivel PMC guardados en este navegador. ¿Continuar?');
    if (!confirmed) return;
    resetProgress();
    setPreview(null);
    setAppliedCount(null);
    setSelectedFileName('');
    setImportDocument(null);
    setSelectedProfileKey('');
    setResetMessage('Progreso local borrado. También se limpió la clave legacy completedTasks para evitar restos como Shortage.');
  };

  return (
    <div className="container-fluid progress-import-page">
      <section className="hero-panel import-hero mb-4">
        <div>
          <span className="eyebrow">Importación local</span>
          <h1>Convierte tus logs en progreso verificable.</h1>
          <p>
            Descarga el extractor, genera un JSON local y revisa exactamente qué cambiará antes de tocar tu progreso.
            KappaTracker valida IDs contra el catálogo actual y nunca envía tus logs a ningún servidor.
          </p>
          <div className="import-privacy-strip" aria-label="Garantías de privacidad">
            <span>Solo lectura</span>
            <span>Sin credenciales</span>
            <span>Sin llamadas de red</span>
          </div>
        </div>
        <div className="import-quick-actions">
          <a className="btn btn-primary import-download" href={extractorDownloadPath} download>
            Descargar extractor ZIP
          </a>
          <a className="import-script-link" href={extractorScriptPath} download>
            Descargar solo el script .mjs
          </a>
          <span>Descomprime el ZIP, ejecuta el script de tu sistema y luego sube el JSON en el paso 3.</span>
        </div>
      </section>

      <section className="import-flow-panel mb-3" aria-labelledby="import-flow-title">
        <div>
          <span className="eyebrow">Flujo seguro</span>
          <h2 id="import-flow-title">Tres pasos, sin sobrescribir a ciegas.</h2>
        </div>
        <div className="import-flow-steps">
          <div className="import-flow-step">
            <span>1</span>
            <strong>Genera el JSON</strong>
            <p>El extractor lee logs locales y crea un snapshot fuera del juego.</p>
          </div>
          <div className="import-flow-step">
            <span>2</span>
            <strong>Revisa el preview</strong>
            <p>Verás nuevas completadas, iniciadas, warnings e IDs desconocidos.</p>
          </div>
          <div className="import-flow-step">
            <span>3</span>
            <strong>Confirma cambios</strong>
            <p>Solo al aplicar se actualiza el progreso local del navegador.</p>
          </div>
        </div>
      </section>

      {lastImport && (
        <section className="import-status-banner mb-3" aria-label="Estado de la última importación">
          <div>
            <span className="eyebrow">Última importación</span>
            <strong>{formatDate(lastImport.importedAt)}</strong>
            <p>
              {lastImport.mode ? `Perfil ${MODE_LABEL[lastImport.mode]} · ` : ''}
              {lastImport.addedCompletedCount} completadas nuevas · {lastImport.detectedStartedCount} iniciadas ·{' '}
              {lastImport.failedMarkedCompletedCount ?? 0} fallidas cerradas · {lastImport.warningCount} avisos ·{' '}
              {lastImport.unknownTaskCount} IDs no reconocidos
            </p>
          </div>
          <Link className="btn btn-outline-light" to="/">
            Volver a Mission Control
          </Link>
        </section>
      )}

      <div className="row g-3 align-items-stretch">
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h4">Cómo generar el archivo</h2>
              <ol className="import-steps">
                <li>Cierra Escape from Tarkov y el launcher para evitar logs en escritura.</li>
                <li>Descarga el ZIP, descomprímelo y ejecuta <code>run-windows.bat</code> o <code>run-linux.sh</code>.</li>
                <li>Sube aquí el archivo <code>kappa-progress-import.json</code> y revisa el preview antes de aplicar.</li>
              </ol>
              <p className="text-muted mt-3 mb-2">Comando avanzado si prefieres ejecutar el <code>.mjs</code> directamente:</p>
              <pre className="import-command" aria-label="Comando para generar el JSON">{extractorCommand}</pre>
              <p className="text-muted small">
                Si la carpeta se detecta automáticamente, también puedes ejecutar <code>node eft-log-importer.mjs</code>.
              </p>
              <div className="import-note">
                El extractor lee las sesiones de <code>EscapeFromTarkov/Logs</code> desde la versión 1.2 y separa el progreso de
                cada perfil (PvE, PvP y PvP Season) según el servidor con el que habla. No modifica la carpeta del juego ni guarda
                tus IDs de cuenta o perfil.
              </div>
              <label className="import-dropzone import-dropzone--inline mt-3">
                <span>Subir JSON generado</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => readFile(event.target.files?.[0])}
                />
                <small>{selectedFileName ? `Seleccionado: ${selectedFileName}` : 'Aún no has seleccionado ningún archivo.'}</small>
              </label>
              <h3 className="h5 mt-4">Contrato esperado</h3>
              <p className="text-muted">
                El extractor 2.0 genera <code>schemaVersion: 2</code> con un bloque por perfil detectado. Los archivos antiguos
                (<code>schemaVersion: 1</code>) se siguen aceptando.
              </p>
              <pre className="import-schema" aria-label="Ejemplo de JSON de importación">{`{
  "schemaVersion": 2,
  "source": "eft-local-logs",
  "generatedAt": "2026-11-18T00:00:00.000Z",
  "since": "1.2.0.0",
  "profiles": [{
    "profileKey": "pve:e3277b1f",
    "mode": "pve",
    "sessionCount": 4,
    "completedTaskIds": ["59689ee586f7740d1570bbd5"],
    "startedTaskIds": [],
    "failedTaskIds": [],
    "unknownTasks": []
  }],
  "warnings": []
}`}</pre>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card h-100 import-preview-card">
            <div className="card-body">
              <div className="import-preview-heading">
                <div>
                  <span className="eyebrow">Paso 3</span>
                  <h2 className="h4">Preview antes de aplicar</h2>
                </div>
                {selectedFileName && <span>{selectedFileName}</span>}
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              {resetMessage && <div className="alert alert-success">{resetMessage}</div>}
              {appliedCount !== null && (
                <div className="alert alert-success">
                  Importación aplicada. Se añadieron {appliedCount} completadas contando prerequisitos reales, incluidas{' '}
                  {preview?.newFailedTaskIds.length ?? 0} fallidas que ya no se pueden completar, y{' '}
                  {preview?.validStartedTaskIds.length ?? 0} iniciadas detectadas.
                </div>
              )}
              {importDocument && (
                <fieldset className="import-profile-picker mb-3">
                  <legend className="h5">Perfil a importar</legend>
                  <p className="text-muted small mb-2">
                    Sesiones desde la versión {importDocument.since || '—'} ({importDocument.sessionCount} leídas). Elige qué perfil
                    aplicar: solo se importan sus misiones.
                  </p>
                  <div className="import-profile-options">
                    {importDocument.profiles.map((profile) => (
                      <label
                        key={profile.profileKey}
                        className={`import-profile-option${profile.profileKey === selectedProfileKey ? ' is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="import-profile"
                          value={profile.profileKey}
                          checked={profile.profileKey === selectedProfileKey}
                          onChange={() => chooseProfile(importDocument, profile.profileKey)}
                        />
                        <span className={`import-mode-badge import-mode-badge--${profile.mode}`}>{MODE_LABEL[profile.mode]}</span>
                        <span className="import-profile-id">Perfil {profile.profileKey.split(':')[1]}</span>
                        <span className="import-profile-counts">
                          {profile.completedTaskIds.length} completadas · {profile.startedTaskIds.length} en curso ·{' '}
                          {profile.failedTaskIds.length} fallidas · {profile.sessionCount} {profile.sessionCount === 1 ? 'sesión' : 'sesiones'}
                          {profile.versionRange.newest ? ` · v${profile.versionRange.newest}` : ''}
                          {profile.lastSeen ? ` · último evento ${formatDate(profile.lastSeen.replace(' ', 'T'))}` : ''}
                        </span>
                        {profile.modeConfidence !== 'high' && (
                          <span className="import-profile-warning">Modo detectado con poca seguridad</span>
                        )}
                      </label>
                    ))}
                  </div>
                  {isOtherMode && selectedProfile && (
                    <div className="alert alert-warning mt-3 mb-0">
                      <p className="mb-2">
                        Has elegido un perfil {MODE_LABEL[selectedProfile.mode]}, pero el progreso de la web es PvE. Aplicarlo
                        mezclaría progresos de modos distintos hasta que existan perfiles separados (#71).
                      </p>
                      <label className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={confirmOtherMode}
                          onChange={(event) => setConfirmOtherMode(event.target.checked)}
                        />{' '}
                        <span className="form-check-label">Entiendo el riesgo y quiero aplicarlo igualmente</span>
                      </label>
                    </div>
                  )}
                </fieldset>
              )}
              {!preview && !error && (
                <div className="import-empty-preview">
                  <span>Esperando JSON</span>
                  <strong>Selecciona un archivo para ver qué se aplicaría.</strong>
                  <p>El preview aparecerá aquí con contadores, lista de misiones y avisos antes de confirmar.</p>
                </div>
              )}
              {preview && (
                <div className="import-preview">
                  <div className="import-trust-row" aria-label="Validaciones de seguridad">
                    <span>Catálogo validado</span>
                    <span>Preview obligatorio</span>
                    <span>No borra progreso</span>
                  </div>
                  <div className="import-stats" aria-label="Resumen de importación">
                    <span><strong>{preview.newCompletedTaskIds.length}</strong> nuevas completadas</span>
                    <span><strong>{preview.alreadyCompletedTaskIds.length}</strong> ya estaban completadas</span>
                    <span><strong>{preview.newFailedTaskIds.length}</strong> fallidas cerradas</span>
                    <span><strong>{preview.validStartedTaskIds.length}</strong> iniciadas detectadas</span>
                    <span><strong>{preview.unknownTaskIds.length}</strong> no reconocidas</span>
                  </div>
                  <dl className="import-meta">
                    <dt>Fuente</dt>
                    <dd>{preview.importFile.source}</dd>
                    <dt>Generado</dt>
                    <dd>{formatDate(preview.importFile.generatedAt)}</dd>
                    <dt>Perfil</dt>
                    <dd>
                      {selectedProfile
                        ? `${MODE_LABEL[selectedProfile.mode]} · ${selectedProfile.profileKey.split(':')[1]}`
                        : 'No indicado (archivo antiguo: puede mezclar PvE y PvP)'}
                    </dd>
                  </dl>
                  {newCompletedTitles.length > 0 && (
                    <div>
                      <h3 className="h5">Nuevas misiones completadas</h3>
                      <ul className="import-task-list import-task-list--complete">
                        {newCompletedTitles.map((title) => <li key={title}>{title}</li>)}
                      </ul>
                      {preview.newCompletedTaskIds.length > newCompletedTitles.length && (
                        <p className="text-muted">Y {preview.newCompletedTaskIds.length - newCompletedTitles.length} más.</p>
                      )}
                    </div>
                  )}
                  {startedTitles.length > 0 && (
                    <div>
                      <h3 className="h5">Misiones iniciadas detectadas</h3>
                      <ul className="import-task-list import-task-list--started">
                        {startedTitles.map((title) => <li key={title}>{title}</li>)}
                      </ul>
                      {preview.validStartedTaskIds.length > startedTitles.length && (
                        <p className="text-muted">Y {preview.validStartedTaskIds.length - startedTitles.length} más.</p>
                      )}
                    </div>
                  )}
                  {failedTitles.length > 0 && (
                    <details className="import-details import-details--failed mb-3" open>
                      <summary>Fallidas que se marcarán como terminadas automáticamente</summary>
                      <p className="text-muted mt-2">
                        Tarkov marca algunas tareas como fallidas al elegir una ruta alternativa. Como no se pueden
                        completar después, KappaTracker las cierra para no bloquear tu progreso.
                      </p>
                      <ul className="import-task-list mt-2 mb-0">
                        {failedTitles.map((title) => <li key={title}>{title}</li>)}
                      </ul>
                      {preview.newFailedTaskIds.length > failedTitles.length && (
                        <p className="text-muted">Y {preview.newFailedTaskIds.length - failedTitles.length} más.</p>
                      )}
                    </details>
                  )}
                  {preview.warnings.length > 0 && (
                    <div className="alert alert-warning">
                      {preview.warnings.join(' ')}
                    </div>
                  )}
                  {preview.unknownTaskIds.length > 0 && (
                    <details className="import-details mb-3">
                      <summary>Ver IDs no reconocidos</summary>
                      <code>{preview.unknownTaskIds.join(', ')}</code>
                    </details>
                  )}
                  <div className="import-apply-row">
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={applyImport}
                      disabled={!canApplyImport}
                    >
                      Aplicar progreso detectado
                    </button>
                    <p>
                      Se añadirán completadas/prerequisitos, se cerrarán fallidas detectadas y se conservarán las iniciadas pendientes. Las misiones manuales existentes se conservan.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="import-limits card mt-3">
        <div className="card-body">
          <h2 className="h4">Límites conocidos</h2>
          <div className="import-limit-grid">
            <div>
              <strong>No reconstruye todo el perfil</strong>
              <p>Los logs locales no incluyen una foto completa del estado actual. Solo detectamos eventos que siguen presentes en archivos guardados.</p>
            </div>
            <div>
              <strong>Las completadas antiguas pueden faltar</strong>
              <p>Si el log fue rotado, borrado o la misión se completó antes del rango disponible, no aparecerá en el JSON.</p>
            </div>
            <div>
              <strong>Tú confirmas los cambios</strong>
              <p>La web solo une completadas reconocidas después del preview y nunca elimina progreso manual existente.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card mt-3">
        <div className="card-body import-reset-panel">
          <div>
            <h2 className="h4">Borrar progreso local</h2>
            <p>
              Si una quest queda marcada por datos antiguos del navegador, usa este reset. Borra <code>userProgress</code>,
              <code>completedTasks</code> y <code>playerLevel</code> para dejar el tracker limpio antes de volver a importar.
            </p>
          </div>
          <button className="btn btn-outline-danger" type="button" onClick={handleResetProgress}>
            Borrar todo mi progreso
          </button>
        </div>
      </section>
    </div>
  );
};

export default ProgressImportPage;
