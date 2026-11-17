import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const outputPath = resolve('public/downloads/eft-log-importer.mjs');
const zipOutputPath = resolve('public/downloads/eft-log-importer.zip');

/** Bundles the real extractor code (tools/eft-log-importer/standalone.ts) with the catalog index. */
async function bundleStandalone() {
  const result = await build({
    entryPoints: [resolve('tools/eft-log-importer/standalone.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    write: false,
    legalComments: 'none',
    banner: { js: '#!/usr/bin/env node\n// Generado por scripts/buildExtractorDownload.ts - no editar a mano.' },
  });
  return result.outputFiles[0].text;
}

const packageReadme = `Kappa Progress Tracker - EFT Log Importer
================================================

Este paquete genera kappa-progress-import.json leyendo logs locales de Escape from Tarkov.

Privacidad
----------
- Solo lee EscapeFromTarkov/Logs (canales application, backend y push-notifications) desde la version 1.2.
- Separa el progreso de cada perfil (PvE, PvP, PvP Season) segun el servidor con el que habla.
- No guarda IDs de cuenta ni de perfil: cada perfil se identifica con un hash corto.
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
6. Vuelve a la web, abre /import, sube el JSON generado y elige el perfil a aplicar (PvE por defecto).

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
  const standalone = await bundleStandalone();
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
