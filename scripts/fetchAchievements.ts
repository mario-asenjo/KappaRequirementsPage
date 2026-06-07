import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { Achievement } from '../src/types';

const query = `{
  achievements {
    id
    name
    description
    hidden
    rarity
    imageLink
    playersCompletedPercent
  }
}`;

const normalize = (value: string) => value.trim().toLowerCase();

function stripWikiMarkup(value: string) {
  return value
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/'''/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractLinks(value: string) {
  return Array.from(value.matchAll(/\[\[([^|\]#]+)(?:#[^|\]]+)?(?:\|[^\]]+)?\]\]/g))
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function splitWikiRows(tableSource: string) {
  return tableSource
    .split('\n|-')
    .slice(1)
    .map((row) => row.trim())
    .filter((row) => row.startsWith('|'));
}

function splitWikiCells(rowSource: string) {
  return rowSource
    .split('\n|')
    .map((cell) => cell.replace(/^\|/, '').trim())
    .filter(Boolean);
}

function parseWikiAchievements(wikiSource: string) {
  const sections = Array.from(wikiSource.matchAll(/==([^=]+)==([\s\S]*?)(?=\n==[^=]+==|$)/g));
  const wikiByName = new Map<string, Achievement['wiki']>();

  sections.forEach((sectionMatch) => {
    const section = sectionMatch[1].trim();
    const sectionSource = sectionMatch[2];
    const tableMatches = Array.from(sectionSource.matchAll(/\{\|[\s\S]*?\n\|\}/g));

    tableMatches.forEach((tableMatch) => {
      splitWikiRows(tableMatch[0]).forEach((row) => {
        const cells = splitWikiCells(row);
        const iconCellIndex = cells.findIndex((cell) => /File:/i.test(cell));
        if (iconCellIndex === -1) return;

        const nameCell = cells[iconCellIndex + 1];
        if (!nameCell || /^data-sort-value/i.test(nameCell)) return;
        const name = stripWikiMarkup(nameCell);
        const description = stripWikiMarkup(cells[iconCellIndex + 2] ?? '');
        const reward = stripWikiMarkup(cells[iconCellIndex + 3] ?? '');
        const raw = cells.join('\n');

        wikiByName.set(normalize(name), {
          section,
          reward,
          rawDescription: description,
          links: Array.from(new Set(extractLinks(raw))),
        });
      });
    });
  });

  return wikiByName;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`HTTP error ${response.status} ${response.statusText}`);
  return response.json();
}

async function fetchWikiAchievementSource() {
  const url = 'https://escapefromtarkov.fandom.com/api.php?action=query&titles=Achievements&prop=revisions&rvprop=content&rvslots=main&format=json';
  const json = await fetchJson(url) as any;
  const pages = json?.query?.pages;
  const page = pages ? Object.values(pages)[0] as any : undefined;
  return page?.revisions?.[0]?.slots?.main?.['*'] ?? '';
}

async function fetchAchievements() {
  const endpoint = 'https://api.tarkov.dev/graphql';
  const [apiJson, wikiSource] = await Promise.all([
    fetchJson(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    }) as Promise<any>,
    fetchWikiAchievementSource(),
  ]);

  if (Array.isArray(apiJson?.errors) && apiJson.errors.length > 0) {
    throw new Error(`GraphQL error: ${apiJson.errors.map((error: any) => error.message).join('; ')}`);
  }

  const wikiByName = parseWikiAchievements(wikiSource);
  const achievements = (apiJson?.data?.achievements ?? [])
    .map((achievement: any): Achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description || undefined,
      hidden: Boolean(achievement.hidden),
      rarity: achievement.rarity || undefined,
      imageLink: achievement.imageLink || undefined,
      playersCompletedPercent: achievement.playersCompletedPercent,
      wiki: wikiByName.get(normalize(achievement.name)),
    }))
    .sort((a: Achievement, b: Achievement) => a.name.localeCompare(b.name));

  const filePath = fileURLToPath(new URL('../src/data/achievements.json', import.meta.url));
  const payload = {
    metadata: {
      sources: ['https://api.tarkov.dev/graphql', 'https://escapefromtarkov.fandom.com/wiki/Achievements'],
      syncedAt: new Date().toISOString(),
      achievementCount: achievements.length,
      wikiEnrichedCount: achievements.filter((achievement: Achievement) => achievement.wiki).length,
    },
    achievements,
  };

  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Fetched ${achievements.length} achievements and wrote to ${filePath}`);
}

fetchAchievements().catch((error) => {
  console.error(error);
  process.exit(1);
});
