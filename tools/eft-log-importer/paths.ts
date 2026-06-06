import { access } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';

export const DEFAULT_OUTPUT = 'kappa-progress-import.json';

export function getArg(argv: string[], name: string) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

export function getCandidateEftPaths(argv: string[] = process.argv, env: NodeJS.ProcessEnv = process.env) {
  const explicitPath = getArg(argv, '--eft') ?? getArg(argv, '--logs') ?? env.EFT_PATH;
  if (explicitPath) return [resolve(explicitPath)];

  const candidates = [
    env.EFT_INSTALL_PATH,
    platform() === 'win32' ? 'C:\\Battlestate Games\\EFT\\EscapeFromTarkov' : undefined,
    platform() === 'win32' ? 'C:\\Games\\EscapeFromTarkov' : undefined,
    join(homedir(), 'Desktop', 'EFTINSTALLFOLDER', 'EscapeFromTarkov'),
    '/mnt/c/Battlestate Games/EFT/EscapeFromTarkov',
    '/mnt/c/Games/EscapeFromTarkov',
    '/mnt/c/Users/masen/Desktop/EFTINSTALLFOLDER/EscapeFromTarkov',
  ];

  return Array.from(new Set(candidates.filter((value): value is string => Boolean(value)).map((value) => resolve(value))));
}

export async function hasReadableLogs(eftPath: string) {
  try {
    await access(join(eftPath, 'Logs'));
    return true;
  } catch {
    return false;
  }
}

export async function resolveEftPath(argv: string[] = process.argv, env: NodeJS.ProcessEnv = process.env) {
  const candidates = getCandidateEftPaths(argv, env);
  for (const candidate of candidates) {
    if (await hasReadableLogs(candidate)) return candidate;
  }
  return undefined;
}
