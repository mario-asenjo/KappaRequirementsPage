import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import taskData from '../src/data/tasks.json';
import { Task } from '../src/types';

const outputPath = resolve('public/downloads/eft-log-importer.mjs');
const zipOutputPath = resolve('public/downloads/eft-log-importer.zip');
const taskIds = (taskData.tasks as Task[]).map((task) => task.id).sort();

const standalone = `#!/usr/bin/env node
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';

const TASK_IDS = new Set(${JSON.stringify(taskIds)});
const DEFAULT_OUTPUT = 'kappa-progress-import.json';
const PUSH_LOG_PATTERN = /push-notifications_.*\\.log$/i;
const TEMPLATE_PATTERN = /"templateId"\\s*:\\s*"([0-9a-f]{24})\\s+(description|successMessageText|failMessageText)"/g;
const PROFILE_PATTERN = /"profileid"\\s*:\\s*"([^"]+)"/i;

function getArg(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function unique(values) {
  return Array.from(new Set(values));
}

function eventFromSuffix(suffix) {
  if (suffix === 'successMessageText') return 'completed';
  if (suffix === 'failMessageText') return 'failed';
  return 'started';
}

function getCandidateEftPaths(argv = process.argv, env = process.env) {
  const explicitPath = getArg(argv, '--eft') ?? getArg(argv, '--logs') ?? env.EFT_PATH;
  if (explicitPath) return [resolve(explicitPath)];

  const candidates = [
    env.EFT_INSTALL_PATH,
    platform() === 'win32' ? 'C:\\\\Battlestate Games\\\\EFT\\\\EscapeFromTarkov' : undefined,
    platform() === 'win32' ? 'C:\\\\Games\\\\EscapeFromTarkov' : undefined,
    join(homedir(), 'Desktop', 'EFTINSTALLFOLDER', 'EscapeFromTarkov'),
    '/mnt/c/Battlestate Games/EFT/EscapeFromTarkov',
    '/mnt/c/Games/EscapeFromTarkov',
    '/mnt/c/Users/masen/Desktop/EFTINSTALLFOLDER/EscapeFromTarkov',
  ];

  return unique(candidates.filter(Boolean).map((value) => resolve(value)));
}

async function hasReadableLogs(eftPath) {
  try {
    await access(join(eftPath, 'Logs'));
    return true;
  } catch {
    return false;
  }
}

async function resolveEftPath(argv = process.argv, env = process.env) {
  const candidates = getCandidateEftPaths(argv, env);
  for (const candidate of candidates) {
    if (await hasReadableLogs(candidate)) return candidate;
  }
  return undefined;
}

async function walkLogs(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkLogs(path);
    if (entry.isFile() && PUSH_LOG_PATTERN.test(entry.name)) return [path];
    return [];
  }));

  return files.flat();
}

function parsePushLog(text, file) {
  const matches = [];
  const profileIds = [];
  let match;
  TEMPLATE_PATTERN.lastIndex = 0;

  while ((match = TEMPLATE_PATTERN.exec(text))) {
    matches.push({
      taskId: match[1],
      suffix: match[2],
      templateId: match[0].match(/"([0-9a-f]{24}\\s+[^"]+)"/)?.[1] ?? match[1] + ' ' + match[2],
      file,
      line: text.slice(0, match.index).split('\\n').length,
    });
  }

  text.split('\\n').forEach((line) => {
    const profileMatch = PROFILE_PATTERN.exec(line);
    if (profileMatch) profileIds.push(profileMatch[1]);
  });

  return { matches, profileIds };
}

async function extractProgressFromLogs(eftPath) {
  const logsRoot = join(eftPath, 'Logs');
  const logFiles = await walkLogs(logsRoot);
  const completedTaskIds = [];
  const startedTaskIds = [];
  const failedTaskIds = [];
  const rawMatches = [];
  const unmatchedTemplateIds = [];
  const profileIds = [];

  for (const logFile of logFiles) {
    const text = await readFile(logFile, 'utf8').catch(() => '');
    const relativeFile = relative(eftPath, logFile) || basename(logFile);
    const parsed = parsePushLog(text, relativeFile);
    profileIds.push(...parsed.profileIds);

    parsed.matches.forEach((templateMatch) => {
      const event = eventFromSuffix(templateMatch.suffix);
      const isKnownTask = TASK_IDS.has(templateMatch.taskId);

      if (event === 'completed' && isKnownTask) completedTaskIds.push(templateMatch.taskId);
      if (event === 'started' && isKnownTask) startedTaskIds.push(templateMatch.taskId);
      if (event === 'failed' && isKnownTask) failedTaskIds.push(templateMatch.taskId);
      if (!isKnownTask) unmatchedTemplateIds.push({ templateId: templateMatch.templateId, event });

      rawMatches.push({
        taskId: templateMatch.taskId,
        event,
        file: templateMatch.file,
        line: templateMatch.line,
        templateId: templateMatch.templateId,
        confidence: isKnownTask ? 'high' : 'low',
      });
    });
  }

  const warnings = ['Local logs may be incomplete. Completed quests before retained logs cannot be detected.'];
  if (logFiles.length === 0) warnings.push('No push-notifications logs were found under EscapeFromTarkov/Logs.');

  return {
    schemaVersion: 1,
    source: 'eft-local-logs',
    generatedAt: new Date().toISOString(),
    profile: { profileId: unique(profileIds)[0] },
    completedTaskIds: unique(completedTaskIds),
    startedTaskIds: unique(startedTaskIds).filter((id) => !completedTaskIds.includes(id)),
    failedTaskIds: unique(failedTaskIds),
    rawMatches,
    unmatchedTemplateIds,
    warnings,
  };
}

function printHelp() {
  console.log(\`Usage: node eft-log-importer.mjs --eft "C:\\\\Games\\\\EscapeFromTarkov" --out kappa-progress-import.json

If --eft is omitted, the extractor tries common install locations and EFT_PATH/EFT_INSTALL_PATH.

Options:
  --eft <path>   Path to the EscapeFromTarkov installation folder.
  --out <path>   Output JSON path. Defaults to ./kappa-progress-import.json.
  --help         Show this help.

The extractor is read-only: it scans EscapeFromTarkov/Logs and writes only the output JSON.\`);
}

async function main() {
  if (process.argv.includes('--help')) {
    printHelp();
    return;
  }

  const eftPath = await resolveEftPath();
  if (!eftPath) {
    printHelp();
    console.error('\\nNo readable EscapeFromTarkov/Logs folder was found. Tried:');
    getCandidateEftPaths().forEach((candidate) => console.error('- ' + candidate));
    console.error('\\nPass the folder explicitly with --eft or set EFT_PATH.');
    process.exitCode = 1;
    return;
  }

  const outputPath = resolve(getArg(process.argv, '--out') ?? DEFAULT_OUTPUT);
  const result = await extractProgressFromLogs(eftPath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(result, null, 2) + '\\n', 'utf8');

  console.log('Wrote ' + outputPath);
  console.log('Completed quests: ' + result.completedTaskIds.length);
  console.log('Started quests: ' + (result.startedTaskIds?.length ?? 0));
  console.log('Failed/alternative quests: ' + (result.failedTaskIds?.length ?? 0));
  console.log('Unmatched template IDs: ' + (result.unmatchedTemplateIds?.length ?? 0));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
`;

const packageReadme = `Kappa Progress Tracker - EFT Log Importer
================================================

Este paquete genera kappa-progress-import.json leyendo logs locales de Escape from Tarkov.

Privacidad
----------
- Solo lee EscapeFromTarkov/Logs/**/push-notifications_*.log.
- No modifica archivos del juego.
- No pide credenciales.
- No hace llamadas de red.

Uso Recomendado
---------------
1. Cierra Escape from Tarkov y Battlestate Launcher.
2. Descomprime este ZIP en una carpeta normal, por ejemplo Descargas.
3. Ejecuta el script de tu sistema:
   - Windows: doble click en run-windows.bat
   - Linux/macOS/WSL: ./run-linux.sh
4. Cuando pregunte por la carpeta de instalacion, introduce la carpeta EscapeFromTarkov que contiene Logs.
5. Cuando pregunte por salida, pulsa Enter para usar kappa-progress-import.json.
6. Vuelve a la web, abre /import y sube el JSON generado.

Ejemplos De Ruta
----------------
Windows:
C:\\Games\\EscapeFromTarkov
C:\\Battlestate Games\\EFT\\EscapeFromTarkov

WSL:
/mnt/c/Users/<usuario>/Desktop/EFTINSTALLFOLDER/EscapeFromTarkov

Solucion De Problemas
---------------------
- Si Node.js no esta instalado, los scripts intentan instalarlo o muestran instrucciones.
- Si el extractor dice que no encuentra Logs, revisa que la ruta sea la carpeta EscapeFromTarkov, no la carpeta Logs.
- Si detecta 0 completadas, puede que los logs antiguos hayan rotado o no contengan eventos successMessageText.
- El JSON no es una foto completa del perfil: solo contiene eventos que siguen presentes en tus logs locales.
`;

const windowsRunner = `@echo off
setlocal
title Kappa Progress Tracker - EFT Log Importer

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Node.js no esta instalado.
  where winget >nul 2>nul
  if %ERRORLEVEL% equ 0 (
    echo Intentando instalar Node.js LTS con winget...
    winget install OpenJS.NodeJS.LTS
  ) else (
    echo Instala Node.js LTS desde https://nodejs.org/ y vuelve a ejecutar este archivo.
    start https://nodejs.org/
    pause
    exit /b 1
  )
)

echo.
echo Carpeta de instalacion de EscapeFromTarkov.
echo Dejala vacia para intentar autodeteccion.
set /p EFT_PATH_INPUT=Ruta EFT: 

echo.
set /p OUT_PATH=Archivo de salida [kappa-progress-import.json]: 
if "%OUT_PATH%"=="" set OUT_PATH=kappa-progress-import.json

if "%EFT_PATH_INPUT%"=="" (
  node "%~dp0eft-log-importer.mjs" --out "%OUT_PATH%"
) else (
  node "%~dp0eft-log-importer.mjs" --eft "%EFT_PATH_INPUT%" --out "%OUT_PATH%"
)

echo.
echo Si se genero correctamente, importa %OUT_PATH% en la pagina /import.
pause
`;

const linuxRunner = `#!/usr/bin/env sh
set -eu

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js no esta instalado. Intentando instalarlo..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update && sudo apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y nodejs
  elif command -v pacman >/dev/null 2>&1; then
    sudo pacman -S --needed nodejs
  elif command -v brew >/dev/null 2>&1; then
    brew install node
  else
    echo "No pude instalar Node automaticamente. Instala Node.js LTS desde https://nodejs.org/"
    exit 1
  fi
fi

printf "Carpeta EscapeFromTarkov (Enter para autodetectar): "
read -r EFT_PATH_INPUT
printf "Archivo de salida [kappa-progress-import.json]: "
read -r OUT_PATH
OUT_PATH="\${OUT_PATH:-kappa-progress-import.json}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -z "$EFT_PATH_INPUT" ]; then
  node "$SCRIPT_DIR/eft-log-importer.mjs" --out "$OUT_PATH"
else
  node "$SCRIPT_DIR/eft-log-importer.mjs" --eft "$EFT_PATH_INPUT" --out "$OUT_PATH"
fi

echo "Si se genero correctamente, importa $OUT_PATH en la pagina /import."
`;

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function writeUInt32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function createZip(files: Array<{ name: string; content: string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  files.forEach((file) => {
    const name = Buffer.from(file.name, 'utf8');
    const content = Buffer.from(file.content, 'utf8');
    const crc = crc32(content);
    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(crc),
      writeUInt32(content.length),
      writeUInt32(content.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name,
    ]);

    localParts.push(localHeader, content);
    centralParts.push(Buffer.concat([
      writeUInt32(0x02014b50),
      writeUInt16(20),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(crc),
      writeUInt32(content.length),
      writeUInt32(content.length),
      writeUInt16(name.length),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(file.name.endsWith('.sh') ? 0o100755 << 16 : 0),
      writeUInt32(offset),
      name,
    ]));
    offset += localHeader.length + content.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(files.length),
    writeUInt16(files.length),
    writeUInt32(centralDirectory.length),
    writeUInt32(offset),
    writeUInt16(0),
  ]);

  return Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);
}

async function main() {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, standalone, 'utf8');
  await writeFile(zipOutputPath, createZip([
    { name: 'README.txt', content: packageReadme },
    { name: 'eft-log-importer.mjs', content: standalone },
    { name: 'run-windows.bat', content: windowsRunner },
    { name: 'run-linux.sh', content: linuxRunner },
  ]));
  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${zipOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
