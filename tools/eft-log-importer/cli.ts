import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import catalogIndex from '../../src/data/catalog-index.json';
import taskData from '../../src/data/tasks.json';
import { Task } from '../../src/types';
import { DEFAULT_SINCE_VERSION, extractProfilesFromLogs, ExtractorCatalog, formatExtractionSummary } from './extractV2';
import { extractProgressFromLogs } from './parser';
import { DEFAULT_OUTPUT, getArg, getCandidateEftPaths, resolveEftPath } from './paths';

function printHelp() {
  console.log(`Uso: npm run extract:logs -- --eft "C:\\Games\\EscapeFromTarkov" --out kappa-progress-import.json

Si omites --eft, se prueban rutas habituales y EFT_PATH/EFT_INSTALL_PATH.

Opciones:
  --eft <ruta>      Carpeta de instalacion de EscapeFromTarkov.
  --out <ruta>      JSON de salida. Por defecto ./kappa-progress-import.json.
  --since <version> Ignora sesiones anteriores (por defecto ${DEFAULT_SINCE_VERSION}).
  --schema 1        Formato antiguo (un unico bloque, sin separar perfiles).
  --help            Muestra esta ayuda.

Solo lectura: recorre EscapeFromTarkov/Logs y escribe unicamente el JSON de salida.
Cada evento se asigna al perfil seleccionado en ese momento y el modo sale del servidor (gw-pve / gw-pvp / gw-pvp-season).`);
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
    console.error('\nIndica la carpeta con --eft o define EFT_PATH.');
    process.exitCode = 1;
    return;
  }

  const outputPath = resolve(getArg(process.argv, '--out') ?? DEFAULT_OUTPUT);
  await mkdir(dirname(outputPath), { recursive: true });

  if (getArg(process.argv, '--schema') === '1') {
    const legacy = await extractProgressFromLogs({ eftPath, tasks: taskData.tasks as Task[] });
    await writeFile(outputPath, `${JSON.stringify(legacy, null, 2)}\n`, 'utf8');
    console.log(`Escrito ${outputPath} (schemaVersion 1, sin separar perfiles).`);
    return;
  }

  const result = await extractProfilesFromLogs({
    eftPath,
    catalog: catalogIndex as ExtractorCatalog,
    sinceVersion: getArg(process.argv, '--since') ?? DEFAULT_SINCE_VERSION,
  });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  formatExtractionSummary(result, outputPath).forEach((line) => console.log(line));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
