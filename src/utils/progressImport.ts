import { GameMode, ProgressImportFile, Task } from '../types';

export interface ProgressImportPreview {
  importFile: ProgressImportFile;
  validCompletedTaskIds: string[];
  validStartedTaskIds: string[];
  validFailedTaskIds: string[];
  newFailedTaskIds: string[];
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

  if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) {
    throw new Error('Version de importacion no soportada. Se esperaba schemaVersion 1 o 2.');
  }

  if (typeof parsed.source !== 'string' || parsed.source.length === 0) {
    throw new Error('El archivo no incluye un campo source valido.');
  }

  if (typeof parsed.generatedAt !== 'string' || parsed.generatedAt.length === 0) {
    throw new Error('El archivo no incluye generatedAt valido.');
  }

  const completedTaskIds = uniqueStrings(parsed.completedTaskIds);
  const failedTaskIds = uniqueStrings(parsed.failedTaskIds);
  if (completedTaskIds.length === 0 && failedTaskIds.length === 0) {
    throw new Error('El archivo no contiene completedTaskIds ni failedTaskIds para importar.');
  }

  return {
    ...(parsed as unknown as ProgressImportFile),
    schemaVersion: parsed.schemaVersion,
    completedTaskIds,
    startedTaskIds: uniqueStrings(parsed.startedTaskIds),
    failedTaskIds,
    unknownTaskIds: uniqueStrings(parsed.unknownTaskIds),
    profile: isObject(parsed.profile) ? { profileId: typeof parsed.profile.profileId === 'string' ? parsed.profile.profileId : undefined, mode: ['pve', 'pvp', 'seasonal-pvp'].includes(String(parsed.profile.mode)) ? parsed.profile.mode as GameMode : undefined } : undefined,
    clientVersion: typeof parsed.clientVersion === 'string' ? parsed.clientVersion : undefined,
    logVersionRange: isObject(parsed.logVersionRange) ? { oldest: typeof parsed.logVersionRange.oldest === 'string' ? parsed.logVersionRange.oldest : undefined, newest: typeof parsed.logVersionRange.newest === 'string' ? parsed.logVersionRange.newest : undefined } : undefined,
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
    ...(importFile.unknownTaskIds ?? []),
  ]);
  const validRawCompletedTaskIds = importFile.completedTaskIds.filter((id) => taskIds.has(id));
  const validFailedTaskIds = (importFile.failedTaskIds ?? []).filter((id) => taskIds.has(id));
  const validCompletedTaskIds = Array.from(new Set([...validRawCompletedTaskIds, ...validFailedTaskIds]));
  const completedOrFailed = new Set(validCompletedTaskIds);
  const validStartedTaskIds = (importFile.startedTaskIds ?? []).filter((id) => taskIds.has(id) && !completedOrFailed.has(id));
  const newCompletedTaskIds = validCompletedTaskIds.filter((id) => !currentCompleted.has(id));
  const newFailedTaskIds = validFailedTaskIds.filter((id) => !currentCompleted.has(id));
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
    newFailedTaskIds,
    newCompletedTaskIds,
    alreadyCompletedTaskIds,
    unknownTaskIds,
    warnings: Array.from(new Set(warnings)),
  };
}
