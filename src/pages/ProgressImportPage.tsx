import React, { useMemo, useState } from 'react';
import useProgress from '../hooks/useProgress';
import { Task } from '../types';
import { getProgressImportPreview, parseProgressImportJson, ProgressImportPreview } from '../utils/progressImport';
import { getCompletionIdsWithPrerequisites } from '../utils/taskPrerequisites';

interface ProgressImportPageProps {
  tasks: Task[];
}

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
  const { completedTaskIds, setCompletedTaskIds } = useProgress();
  const [preview, setPreview] = useState<ProgressImportPreview | null>(null);
  const [error, setError] = useState('');
  const [appliedCount, setAppliedCount] = useState<number | null>(null);
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
        </div>
        <label className="import-dropzone">
          <span>Seleccionar JSON</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => readFile(event.target.files?.[0])}
          />
        </label>
      </section>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h4">Contrato esperado</h2>
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
    </div>
  );
};

export default ProgressImportPage;
