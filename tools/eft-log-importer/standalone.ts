import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import catalogIndex from '../../src/data/catalog-index.json';
import { DEFAULT_SINCE_VERSION, EXTRACTOR_VERSION, extractProfilesFromLogs, ExtractorCatalog, formatExtractionSummary } from './extractV2';
import { DEFAULT_OUTPUT, getArg, getCandidateEftPaths, resolveEftPath } from './paths';

/**
 * Entry point bundled into public/downloads/eft-log-importer.mjs by
 * scripts/buildExtractorDownload.ts. Same code as the repo CLI, no deps.
 */

function printHelp() {
  console.log(`Kappa Progress Tracker - extractor de logs ${EXTRACTOR_VERSION}

Uso: node eft-log-importer.mjs --eft "C:\\Games\\EscapeFromTarkov" --out kappa-progress-import.json

Opciones:
  --eft <ruta>      Carpeta de instalacion de EscapeFromTarkov (la que contiene Logs).
  --out <ruta>      JSON de salida. Por defecto ./${DEFAULT_OUTPUT}.
  --since <version> Ignora sesiones anteriores (por defecto ${DEFAULT_SINCE_VERSION}).
  --help            Muestra esta ayuda.

Solo lectura. Separa el progreso de cada perfil (PvE, PvP, PvP Season) y no guarda IDs de cuenta ni de perfil.`);
}

async function main() {
  if (process.argv.includes('--help')) {
    printHelp();
    return;
  }
  const eftPath = await resolveEftPath();
  if (!eftPath) {
    printHelp();
    console.error('\nNo se encontro una carpeta EscapeFromTarkov/Logs legible. Probadas:');
    getCandidateEftPaths().forEach((candidate) => console.error(`- ${candidate}`));
    process.exitCode = 1;
    return;
  }
  const outputPath = resolve(getArg(process.argv, '--out') ?? DEFAULT_OUTPUT);
  const result = await extractProfilesFromLogs({
    eftPath,
    catalog: catalogIndex as ExtractorCatalog,
    sinceVersion: getArg(process.argv, '--since') ?? DEFAULT_SINCE_VERSION,
  });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  formatExtractionSummary(result, outputPath).forEach((line) => console.log(line));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
