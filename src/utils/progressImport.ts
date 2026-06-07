import { ProgressImportFile, Task } from '../types';

export interface ProgressImportPreview {
  importFile: ProgressImportFile;
  validCompletedTaskIds: string[];
  validStartedTaskIds: string[];
  validFailedTaskIds: string[];
  newCompletedTaskIds: string[];
  alreadyCompletedTaskIds: string[];
  unknownTaskIds: string[];
  warnings: string[];
}

const uniqueStrings = (values: unknown) => {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)));
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function parseProgressImportJson(value: string): ProgressImportFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('El archivo no contiene JSON valido.');
  }

  if (!isObject(parsed)) {
    throw new Error('El archivo de importacion debe ser un objeto JSON.');
  }

  if (parsed.schemaVersion !== 1) {
    throw new Error('Version de importacion no soportada. Se esperaba schemaVersion 1.');
  }

  if (typeof parsed.source !== 'string' || parsed.source.length === 0) {
    throw new Error('El archivo no incluye un campo source valido.');
  }

  if (typeof parsed.generatedAt !== 'string' || parsed.generatedAt.length === 0) {
    throw new Error('El archivo no incluye generatedAt valido.');
  }

  const completedTaskIds = uniqueStrings(parsed.completedTaskIds);
  if (completedTaskIds.length === 0) {
    throw new Error('El archivo no contiene completedTaskIds para importar.');
  }

  return {
    ...(parsed as unknown as ProgressImportFile),
    schemaVersion: 1,
    completedTaskIds,
    startedTaskIds: uniqueStrings(parsed.startedTaskIds),
    failedTaskIds: uniqueStrings(parsed.failedTaskIds),
    warnings: uniqueStrings(parsed.warnings),
  };
}

export function getProgressImportPreview(
  importFile: ProgressImportFile,
  tasks: Task[],
  currentCompletedTaskIds: string[]
): ProgressImportPreview {
  const taskIds = new Set(tasks.map((task) => task.id));
  const currentCompleted = new Set(currentCompletedTaskIds);
  const allImportedIds = new Set([
    ...importFile.completedTaskIds,
    ...(importFile.startedTaskIds ?? []),
    ...(importFile.failedTaskIds ?? []),
  ]);
  const validCompletedTaskIds = importFile.completedTaskIds.filter((id) => taskIds.has(id));
  const validStartedTaskIds = (importFile.startedTaskIds ?? []).filter((id) => taskIds.has(id));
  const validFailedTaskIds = (importFile.failedTaskIds ?? []).filter((id) => taskIds.has(id));
  const newCompletedTaskIds = validCompletedTaskIds.filter((id) => !currentCompleted.has(id));
  const alreadyCompletedTaskIds = validCompletedTaskIds.filter((id) => currentCompleted.has(id));
  const unknownTaskIds = Array.from(allImportedIds).filter((id) => !taskIds.has(id));
  const warnings = [
    ...(importFile.warnings ?? []),
    'La importacion desde logs locales puede estar incompleta si faltan logs antiguos.',
  ];

  return {
    importFile,
    validCompletedTaskIds,
    validStartedTaskIds,
    validFailedTaskIds,
    newCompletedTaskIds,
    alreadyCompletedTaskIds,
    unknownTaskIds,
    warnings: Array.from(new Set(warnings)),
  };
}
