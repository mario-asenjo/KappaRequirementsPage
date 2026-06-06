import React, { useMemo, useState } from 'react';
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
  const { completedTaskIds, resetProgress, setCompletedTaskIds } = useProgress();
  const [preview, setPreview] = useState<ProgressImportPreview | null>(null);
  const [error, setError] = useState('');
  const [appliedCount, setAppliedCount] = useState<number | null>(null);
  const [resetMessage, setResetMessage] = useState('');
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const newCompletedTitles = preview ? getTaskTitles(preview.newCompletedTaskIds.slice(0, 12), tasksById) : [];

  const readFile = async (file?: File) => {
    setError('');
    setAppliedCount(null);
    setPreview(null);

    if (!file) return;

    try {
      const importFile = parseProgressImportJson(await file.text());
      setPreview(getProgressImportPreview(importFile, tasks, completedTaskIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo de importacion.');
    }
  };

  const applyImport = () => {
    if (!preview) return;

    const next = getImportedCompletionIds(preview.newCompletedTaskIds, tasks, tasksById, completedTaskIds);
    setCompletedTaskIds(next);
    setAppliedCount(next.length - completedTaskIds.length);
  };

  const handleResetProgress = () => {
    const confirmed = window.confirm('Esto borrara misiones, achievements manuales y nivel PMC guardados en este navegador. Continuar?');
    if (!confirmed) return;
    resetProgress();
    setPreview(null);
    setAppliedCount(null);
    setResetMessage('Progreso local borrado. Tambien se limpio la clave legacy completedTasks para evitar restos como Shortage.');
  };

  return (
    <div className="container-fluid progress-import-page">
      <section className="hero-panel import-hero mb-4">
        <div>
          <span className="eyebrow">Importacion local</span>
          <h1>Importa progreso detectado desde logs de Escape from Tarkov.</h1>
          <p>
            Carga un JSON generado por la herramienta externa. La web valida IDs contra el catalogo actual,
            muestra un resumen y solo aplica cambios cuando confirmas.
          </p>
          <div className="import-privacy-strip" aria-label="Garantias de privacidad">
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

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h4">Como generar el archivo</h2>
              <ol className="import-steps">
                <li>Cierra Escape from Tarkov y el launcher para evitar logs en escritura.</li>
                <li>Descarga el ZIP, descomprimelo y ejecuta `run-windows.bat` o `run-linux.sh`.</li>
                <li>Sube aqui el archivo `kappa-progress-import.json` y revisa el preview antes de aplicar.</li>
              </ol>
              <p className="text-muted mt-3 mb-2">Comando avanzado si prefieres ejecutar el `.mjs` directamente:</p>
              <pre className="import-command" aria-label="Comando para generar el JSON">{extractorCommand}</pre>
              <p className="text-muted small">
                Si la carpeta se detecta automaticamente, tambien puedes ejecutar `node eft-log-importer.mjs`.
              </p>
              <div className="import-note">
                El extractor lee `EscapeFromTarkov/Logs/**/push-notifications_*.log`. No modifica la carpeta del juego.
              </div>
              <label className="import-dropzone import-dropzone--inline mt-3">
                <span>Subir JSON generado</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => readFile(event.target.files?.[0])}
                />
              </label>
              <h3 className="h5 mt-4">Contrato esperado</h3>
              <p className="text-muted">
                La herramienta debe generar schemaVersion 1, source, generatedAt y completedTaskIds.
              </p>
              <pre className="import-schema" aria-label="Ejemplo de JSON de importacion">{`{
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
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h4">Preview</h2>
              {error && <div className="alert alert-danger">{error}</div>}
              {resetMessage && <div className="alert alert-success">{resetMessage}</div>}
              {appliedCount !== null && (
                <div className="alert alert-success">
                  Importacion aplicada. Se anadieron {appliedCount} misiones contando prerequisitos reales.
                </div>
              )}
              {!preview && !error && <p className="text-muted">Selecciona un archivo para ver que se aplicaria.</p>}
              {preview && (
                <div className="import-preview">
                  <div className="import-stats" aria-label="Resumen de importacion">
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
                      <h3 className="h5">Nuevas misiones detectadas</h3>
                      <ul className="import-task-list">
                        {newCompletedTitles.map((title) => <li key={title}>{title}</li>)}
                      </ul>
                      {preview.newCompletedTaskIds.length > newCompletedTitles.length && (
                        <p className="text-muted">Y {preview.newCompletedTaskIds.length - newCompletedTitles.length} mas.</p>
                      )}
                    </div>
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
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={applyImport}
                    disabled={preview.newCompletedTaskIds.length === 0}
                  >
                    Aplicar completadas detectadas
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="import-limits card mt-3">
        <div className="card-body">
          <h2 className="h4">Limites conocidos</h2>
          <div className="import-limit-grid">
            <div>
              <strong>No reconstruye todo el perfil</strong>
              <p>Los logs locales no incluyen una foto completa del estado actual. Solo detectamos eventos que siguen presentes en archivos guardados.</p>
            </div>
            <div>
              <strong>Las completadas antiguas pueden faltar</strong>
              <p>Si el log fue rotado, borrado o la mision se completo antes del rango disponible, no aparecera en el JSON.</p>
            </div>
            <div>
              <strong>Tu confirmas los cambios</strong>
              <p>La web solo une completadas reconocidas despues del preview y nunca elimina progreso manual existente.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card mt-3">
        <div className="card-body import-reset-panel">
          <div>
            <h2 className="h4">Borrar progreso local</h2>
            <p>
              Si una quest queda marcada por datos antiguos del navegador, usa este reset. Borra `userProgress`,
              `completedTasks` y `playerLevel` para dejar el tracker limpio antes de volver a importar.
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
