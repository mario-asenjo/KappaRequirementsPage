import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useProgress from '../hooks/useProgress';
import { Task } from '../types';
import { getProgressImportPreview, parseProgressImportJson, ProgressImportPreview } from '../utils/progressImport';
import { getCompletionIdsWithPrerequisites } from '../utils/taskPrerequisites';

interface ProgressImportPageProps {
  tasks: Task[];
}

const extractorDownloadPath = '/downloads/eft-log-importer.zip';
const extractorScriptPath = '/downloads/eft-log-importer.mjs';
const extractorCommand = 'node eft-log-importer.mjs --eft "C:\\Games\\EscapeFromTarkov" --out kappa-progress-import.json';

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
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const newCompletedTitles = preview ? getTaskTitles(preview.newCompletedTaskIds.slice(0, 12), tasksById) : [];
  const startedTitles = preview ? getTaskTitles(preview.validStartedTaskIds.slice(0, 8), tasksById) : [];
  const failedTitles = preview ? getTaskTitles(preview.validFailedTaskIds.slice(0, 6), tasksById) : [];
  const canApplyImport = Boolean(preview && (preview.newCompletedTaskIds.length > 0 || preview.validStartedTaskIds.length > 0));
  const lastImport = progress.lastImport;

  const readFile = async (file?: File) => {
    setError('');
    setAppliedCount(null);
    setPreview(null);
    setSelectedFileName(file?.name ?? '');

    if (!file) return;

    try {
      const importFile = parseProgressImportJson(await file.text());
      setPreview(getProgressImportPreview(importFile, tasks, completedTaskIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo de importación.');
    }
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
        unknownTaskCount: preview.unknownTaskIds.length,
        warningCount: preview.warnings.length,
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
              {lastImport.addedCompletedCount} completadas nuevas · {lastImport.detectedStartedCount} iniciadas · {lastImport.warningCount} avisos · {lastImport.unknownTaskCount} IDs no reconocidos
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
                El extractor lee <code>EscapeFromTarkov/Logs/**/push-notifications_*.log</code>. No modifica la carpeta del juego.
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
                La herramienta debe generar schemaVersion 1, source, generatedAt y completedTaskIds.
              </p>
              <pre className="import-schema" aria-label="Ejemplo de JSON de importación">{`{
  "schemaVersion": 1,
  "source": "eft-local-logs",
  "generatedAt": "2026-06-05T20:00:00.000Z",
  "completedTaskIds": ["59689ee586f7740d1570bbd5"],
  "startedTaskIds": [],
  "failedTaskIds": [],
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
                  Importación aplicada. Se añadieron {appliedCount} completadas contando prerequisitos reales y {preview?.validStartedTaskIds.length ?? 0} iniciadas detectadas.
                </div>
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
                    <span><strong>{preview.validStartedTaskIds.length}</strong> iniciadas detectadas</span>
                    <span><strong>{preview.unknownTaskIds.length}</strong> no reconocidas</span>
                  </div>
                  <dl className="import-meta">
                    <dt>Fuente</dt>
                    <dd>{preview.importFile.source}</dd>
                    <dt>Generado</dt>
                    <dd>{formatDate(preview.importFile.generatedAt)}</dd>
                    <dt>Perfil</dt>
                    <dd>{preview.importFile.profile?.profileId ?? 'No indicado'}</dd>
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
                    <details className="import-details mb-3">
                      <summary>Ver misiones fallidas detectadas en logs</summary>
                      <ul className="import-task-list mt-2 mb-0">
                        {failedTitles.map((title) => <li key={title}>{title}</li>)}
                      </ul>
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
                      Se añadirán completadas/prerequisitos e iniciadas detectadas. Las misiones manuales existentes se conservan.
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
