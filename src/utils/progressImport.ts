import { ProgressImportFile, ProgressImportFileV2, ProgressImportProfile, Task } from '../types';

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

export type ParsedProgressImport =
  | { schemaVersion: 1; file: ProgressImportFile }
  | { schemaVersion: 2; document: ProgressImportFileV2 };

const parseJsonObject = (value: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('El archivo no contiene JSON valido.');
  }
  if (!isObject(parsed)) {
    throw new Error('El archivo de importacion debe ser un objeto JSON.');
  }
  return parsed;
};

const MODES = new Set(['pve', 'pvp', 'seasonal-pvp', 'unknown']);
const EVENTS = new Set(['completed', 'started', 'failed']);
const CLASSIFICATIONS = new Set(['other-mode', 'removed', 'unresolved']);

function parseProfile(value: unknown, index: number): ProgressImportProfile {
  if (!isObject(value) || typeof value.profileKey !== 'string' || !value.profileKey) {
    throw new Error(`El perfil ${index + 1} no tiene profileKey valido.`);
  }
  const mode = typeof value.mode === 'string' && MODES.has(value.mode) ? value.mode : 'unknown';
  const versionRange = isObject(value.versionRange) ? value.versionRange : {};
  return {
    profileKey: value.profileKey,
    mode: mode as ProgressImportProfile['mode'],
    modeConfidence: value.modeConfidence === 'high' || value.modeConfidence === 'low' ? value.modeConfidence : 'unknown',
    versionRange: {
      oldest: typeof versionRange.oldest === 'string' ? versionRange.oldest : undefined,
      newest: typeof versionRange.newest === 'string' ? versionRange.newest : undefined,
    },
    sessionCount: typeof value.sessionCount === 'number' ? value.sessionCount : 0,
    firstSeen: typeof value.firstSeen === 'string' ? value.firstSeen : undefined,
    lastSeen: typeof value.lastSeen === 'string' ? value.lastSeen : undefined,
    completedTaskIds: uniqueStrings(value.completedTaskIds),
    startedTaskIds: uniqueStrings(value.startedTaskIds),
    failedTaskIds: uniqueStrings(value.failedTaskIds),
    unknownTasks: Array.isArray(value.unknownTasks)
      ? value.unknownTasks.filter((task): task is ProgressImportProfile['unknownTasks'][number] =>
        isObject(task) && typeof task.id === 'string' && EVENTS.has(String(task.event)) && CLASSIFICATIONS.has(String(task.classification)))
      : [],
  };
}

/** Accepts extractor 1.x (schemaVersion 1) and 2.x (schemaVersion 2, one block per profile) files. */
export function parseProgressImportDocument(value: string): ParsedProgressImport {
  const parsed = parseJsonObject(value);
  if (parsed.schemaVersion === 2) {
    if (typeof parsed.generatedAt !== 'string' || !parsed.generatedAt) {
      throw new Error('El archivo no incluye generatedAt valido.');
    }
    if (!Array.isArray(parsed.profiles)) {
      throw new Error('El archivo no incluye la lista de perfiles.');
    }
    const profiles = parsed.profiles.map(parseProfile);
    if (profiles.length === 0) {
      throw new Error('El archivo no contiene ningun perfil con progreso. Juega una partida y vuelve a ejecutar el extractor.');
    }
    return {
      schemaVersion: 2,
      document: {
        schemaVersion: 2,
        source: typeof parsed.source === 'string' && parsed.source ? parsed.source : 'eft-local-logs',
        generatedAt: parsed.generatedAt,
        extractorVersion: typeof parsed.extractorVersion === 'string' ? parsed.extractorVersion : 'desconocida',
        since: typeof parsed.since === 'string' ? parsed.since : '',
        catalog: isObject(parsed.catalog) ? parsed.catalog as ProgressImportFileV2['catalog'] : {},
        sessionCount: typeof parsed.sessionCount === 'number' ? parsed.sessionCount : 0,
        profiles,
        warnings: uniqueStrings(parsed.warnings),
      },
    };
  }
  return { schemaVersion: 1, file: validateSchemaV1(parsed) };
}

/** Profile suggested by default: the most recent PvE profile, else the most recent one. */
export function getDefaultImportProfile(document: ProgressImportFileV2): ProgressImportProfile | undefined {
  const byRecency = [...document.profiles].sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''));
  return byRecency.find((profile) => profile.mode === 'pve') ?? byRecency[0];
}

/** Turns the chosen profile of a v2 file into the v1 shape the preview/apply flow uses. */
export function selectImportProfile(document: ProgressImportFileV2, profileKey: string): ProgressImportFile {
  const profile = document.profiles.find((candidate) => candidate.profileKey === profileKey);
  if (!profile) throw new Error('El perfil seleccionado no existe en el archivo.');
  return {
    schemaVersion: 1,
    source: document.source,
    generatedAt: document.generatedAt,
    profile: { profileId: profile.profileKey, mode: profile.mode },
    completedTaskIds: profile.completedTaskIds,
    startedTaskIds: profile.startedTaskIds,
    failedTaskIds: profile.failedTaskIds,
    unmatchedTemplateIds: profile.unknownTasks.map((task) => ({ templateId: task.id, event: task.event })),
    warnings: document.warnings,
  };
}

export function parseProgressImportJson(value: string): ProgressImportFile {
  const parsed = parseProgressImportDocument(value);
  if (parsed.schemaVersion === 2) {
    const profile = getDefaultImportProfile(parsed.document);
    if (!profile) throw new Error('El archivo no contiene perfiles.');
    return selectImportProfile(parsed.document, profile.profileKey);
  }
  return parsed.file;
}

function validateSchemaV1(parsed: Record<string, unknown>): ProgressImportFile {
  if (parsed.schemaVersion !== 1) {
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
    schemaVersion: 1,
    completedTaskIds,
    startedTaskIds: uniqueStrings(parsed.startedTaskIds),
    failedTaskIds,
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
