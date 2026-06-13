import { ItemBarterEntry, ItemBarterItem, ItemRequirementEntry, ItemRequirementIndexEntry } from '../src/types/itemPlanner';

const fandomApiUrl = 'https://escapefromtarkov.fandom.com/api.php';
const fandomPageBaseUrl = 'https://escapefromtarkov.fandom.com/wiki/';
const fandomUserAgent = 'KappaTrackerBot/1.0 (https://github.com/mario-asenjo/KappaRequirementsPage)';

export interface FandomItemPage {
  title: string;
  wikitext: string;
}

export interface FandomRequirementParseResult {
  item: {
    id: string;
    name: string;
    normalizedName?: string;
    shortName?: string;
    wikiLink: string;
  };
  requirements: ItemRequirementEntry[];
  barters: ItemBarterEntry[];
}

interface WikiPageRevisionResponse {
  query?: {
    pages?: Array<{
      title: string;
      missing?: boolean;
      revisions?: Array<{
        slots?: { main?: { content?: string } };
      }>;
    }>;
  };
}

interface CategoryMembersResponse {
  continue?: { cmcontinue?: string };
  query?: {
    categorymembers?: Array<{ ns: number; title: string }>;
  };
}

const wikiLinkPattern = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

function slug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function pageUrl(title: string) {
  return `${fandomPageBaseUrl}${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

function normalizeName(value: string | undefined) {
  return value?.trim().toLocaleLowerCase();
}

function stripWikiMarkup(value: string) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/'''/g, '')
    .replace(/''/g, '')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]|#]+)(?:#[^\]]*)?\]\]/g, '$1')
    .replace(/\{\{PAGENAME\}\}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractInfoboxField(wikitext: string, fieldName: string) {
  const match = wikitext.match(new RegExp(`^\\|\\s*${fieldName}\\s*=\\s*([^\\r\\n]+)`, 'im'));
  return match?.[1]?.trim() || undefined;
}

function extractSection(wikitext: string, heading: string) {
  const headingRegex = new RegExp(`^==\\s*${heading}\\s*==\\s*$`, 'im');
  const match = headingRegex.exec(wikitext);
  if (!match) return '';
  const start = match.index + match[0].length;
  const nextHeading = /^==[^=].*==\s*$/gm;
  nextHeading.lastIndex = start;
  const next = nextHeading.exec(wikitext);
  return wikitext.slice(start, next?.index ?? wikitext.length).trim();
}

function extractQuantity(line: string) {
  const match = line.match(/^\*\s*(\d+)\s+need/i) || line.match(/^\*\s*(\d+)\s+(?:is|are)\s+required/i);
  return match ? Number(match[1]) : undefined;
}

function extractLinks(line: string) {
  const links: Array<{ title: string; label: string }> = [];
  for (const match of line.matchAll(wikiLinkPattern)) {
    links.push({ title: match[1].trim(), label: stripWikiMarkup(match[2] || match[1]) });
  }
  return links;
}

function extractQuestSource(line: string) {
  const sourceMatch = line.match(/for\s+the\s+(?:quest|story\s+chapter)\s+(\[\[[^\]]+\]\])/i);
  if (sourceMatch) {
    const [source] = extractLinks(sourceMatch[1]).filter((link) => link.title !== 'Found in raid');
    if (source) return source;
  }

  const links = extractLinks(line).filter((link) => link.title !== 'Found in raid');
  if (links.length === 0) return undefined;
  return links[links.length - 1];
}

function extractHideoutTarget(line: string) {
  const links = extractLinks(line).filter((link) => link.title.startsWith('Hideout'));
  return links[links.length - 1];
}

function parseStationAndLevel(label: string) {
  const clean = stripWikiMarkup(label);
  const levelMatch = clean.match(/(.+?)\s+level\s+(\d+)$/i);
  if (levelMatch) {
    return { stationName: levelMatch[1].trim(), level: Number(levelMatch[2]) };
  }
  return { stationName: clean.trim(), level: 1 };
}

function parseFandomQuestRows(itemId: string, itemTitle: string, wikitext: string): ItemRequirementEntry[] {
  const section = extractSection(wikitext, 'Quests');
  const rows: ItemRequirementEntry[] = [];
  for (const [index, rawLine] of section.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line.startsWith('*')) continue;
    const quantity = extractQuantity(line);
    const source = extractQuestSource(line);
    if (!quantity || !source) continue;
    const storyChapter = /story chapter/i.test(line);
    const stableRequirementSlug = slug(stripWikiMarkup(line.replace(/^\*\s*/, '')).slice(0, 120));
    rows.push({
      id: `fandom:quest:${slug(source.title)}:${stableRequirementSlug}:${itemId}`,
      kind: 'quest',
      quantity,
      countsTowardTotal: true,
      label: source.label,
      description: stripWikiMarkup(line.replace(/^\*\s*/, '')),
      sourceId: `fandom:${slug(source.title)}`,
      sourceName: source.label,
      sourceUrl: pageUrl(source.title),
      trader: storyChapter ? 'Story' : 'Wiki',
      taskId: `fandom:${slug(source.title)}`,
      objectiveId: `fandom:${slug(itemTitle)}:${slug(source.title)}:${stableRequirementSlug}`,
      objectiveType: storyChapter ? 'fandomStoryRequirement' : 'fandomQuestRequirement',
      foundInRaid: /Found in raid|in raid/i.test(line),
      optional: false,
    });
  }
  return rows;
}

function parseFandomHideoutRows(itemId: string, wikitext: string): ItemRequirementEntry[] {
  const section = extractSection(wikitext, 'Hideout');
  const rows: ItemRequirementEntry[] = [];
  for (const [index, rawLine] of section.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line.startsWith('*')) continue;
    const quantity = extractQuantity(line);
    const target = extractHideoutTarget(line);
    if (!quantity || !target) continue;
    const { stationName, level } = parseStationAndLevel(target.label);
    const stableRequirementSlug = slug(stripWikiMarkup(line.replace(/^\*\s*/, '')).slice(0, 120));
    rows.push({
      id: `fandom:hideout:${slug(stationName)}:${level ?? 'unknown'}:${stableRequirementSlug}:${itemId}`,
      kind: 'hideout',
      quantity,
      countsTowardTotal: true,
      label: `${stationName}${level ? ` level ${level}` : ''}`,
      description: stripWikiMarkup(line.replace(/^\*\s*/, '')),
      sourceId: `fandom:hideout:${slug(stationName)}:${level ?? 'unknown'}`,
      sourceName: stationName,
      sourceUrl: pageUrl('Hideout'),
      stationId: `fandom:${slug(stationName)}`,
      stationName,
      level,
      stationLevelId: `fandom:${slug(stationName)}:${level ?? 'unknown'}`,
      prerequisites: [],
      foundInRaid: /Found in raid|in raid/i.test(line),
    });
  }
  return rows;
}

function parseTableCells(row: string) {
  return row
    .split(/\n!/)
    .map((cell) => cell.replace(/^!/, '').trim())
    .filter(Boolean)
    .filter((cell) => !/→|&rarr;|&rightarrow;/i.test(stripWikiMarkup(cell)));
}

function parseBarterItems(cell: string): ItemBarterItem[] {
  const items = new Map<string, ItemBarterItem>();
  const imageLinkPattern = /\[\[File:[^\]]*?\|[^\]]*?link=([^\]|]+)[^\]]*\]\](?:\s*x(\d+))?/gi;
  for (const match of cell.matchAll(imageLinkPattern)) {
    const name = stripWikiMarkup(match[1]);
    if (!name || /^File:/i.test(name)) continue;
    items.set(normalizeName(name) ?? name, {
      name,
      quantity: match[2] ? Number(match[2]) : 1,
      wikiLink: pageUrl(name),
    });
  }

  if (items.size === 0) {
    for (const link of extractLinks(cell).filter((item) => !item.title.startsWith('File:'))) {
      const key = normalizeName(link.label) ?? link.label;
      if (!items.has(key)) items.set(key, { name: link.label, quantity: 1, wikiLink: pageUrl(link.title) });
    }
  }

  return [...items.values()];
}

function parseTraderCell(cell: string) {
  const links = extractLinks(cell).filter((link) => !link.title.startsWith('File:'));
  const traderLink = links.find((link) => /\bLL\d+\b/i.test(link.label)) ?? links[0];
  const levelMatch = stripWikiMarkup(cell).match(/\bLL\s*(\d+)\b/i);
  const traderMarkupPattern = traderLink
    ? new RegExp(`\\[\\[[^\\]]*${traderLink.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\]]*\\]\\]`, 'gi')
    : undefined;
  const traderRequirement = stripWikiMarkup(cell
    .replace(/\[\[File:[^\]]+\]\]/gi, '')
    .replace(traderMarkupPattern ?? /^$/, '')
    .replace(traderLink?.label ?? '', ''))
    .replace(/^\s*\|+\s*/, '')
    .trim();
  return {
    traderName: traderLink ? stripWikiMarkup(traderLink.title) : 'Trader',
    traderLevel: levelMatch ? Number(levelMatch[1]) : undefined,
    traderRequirement: traderRequirement || undefined,
  };
}

function itemListIncludes(items: ItemBarterItem[], itemTitle: string) {
  return items.some((item) => normalizeName(item.name) === normalizeName(itemTitle));
}

function parseFandomTradingRows(itemId: string, itemTitle: string, wikitext: string): ItemBarterEntry[] {
  const section = extractSection(wikitext, 'Trading');
  if (!section) return [];
  const rows: ItemBarterEntry[] = [];
  for (const rawRow of section.split(/\n\|-\s*/).slice(1)) {
    const cells = parseTableCells(rawRow.replace(/\n\|}\s*$/m, ''));
    if (cells.length < 3) continue;
    const requiredItems = parseBarterItems(cells[0]);
    const trader = parseTraderCell(cells[1]);
    const receivedItems = parseBarterItems(cells[2]);
    if (requiredItems.length === 0 || receivedItems.length === 0) continue;
    const itemIsRequired = itemListIncludes(requiredItems, itemTitle);
    const itemIsReceived = itemListIncludes(receivedItems, itemTitle);
    if (!itemIsRequired && !itemIsReceived) continue;
    const direction = itemIsRequired ? 'required' : 'received';
    const tradeSlug = slug(`${requiredItems.map((item) => `${item.quantity}-${item.name}`).join('-')}-for-${receivedItems.map((item) => `${item.quantity}-${item.name}`).join('-')}`);
    rows.push({
      id: `fandom:barter:${direction}:${tradeSlug}:${itemId}`,
      direction,
      traderName: trader.traderName,
      traderLevel: trader.traderLevel,
      traderRequirement: trader.traderRequirement,
      requiredItems,
      receivedItems,
      sourceUrl: pageUrl(itemTitle),
      description: `${requiredItems.map((item) => `${item.name} x${item.quantity}`).join(' + ')} → ${trader.traderName}${trader.traderLevel ? ` LL${trader.traderLevel}` : ''} → ${receivedItems.map((item) => `${item.name} x${item.quantity}`).join(' + ')}`,
    });
  }
  return rows;
}

export function parseFandomItemPage(page: FandomItemPage): FandomRequirementParseResult | undefined {
  const node = extractInfoboxField(page.wikitext, 'node');
  const templateId = extractInfoboxField(page.wikitext, 'id');
  const id = node || `fandom:${templateId || slug(page.title)}`;
  const introShortName = page.wikitext.match(/'''(?:\{\{PAGENAME\}\}|[^']+)'''\s*\(([^)]+)\)/);
  const requirements = [
    ...parseFandomQuestRows(id, page.title, page.wikitext),
    ...parseFandomHideoutRows(id, page.wikitext),
  ];

  const barters = parseFandomTradingRows(id, page.title, page.wikitext);

  if (requirements.length === 0 && barters.length === 0) return undefined;

  return {
    item: {
      id,
      name: page.title,
      normalizedName: page.title.toLocaleLowerCase(),
      shortName: introShortName?.[1]?.trim(),
      wikiLink: pageUrl(page.title),
    },
    requirements,
    barters,
  };
}

function hasEquivalentRequirement(entry: ItemRequirementIndexEntry, incoming: ItemRequirementEntry) {
  if (incoming.kind === 'hideout') {
    return entry.requirements.some((existing) => (
      existing.kind === 'hideout'
      && normalizeName(existing.stationName) === normalizeName(incoming.stationName)
      && existing.level === incoming.level
    ));
  }

  return entry.requirements.some((existing) => (
    existing.kind === 'quest'
    && normalizeName(existing.sourceName) === normalizeName(incoming.sourceName)
  ));
}

export function mergeFandomRequirements(
  index: Map<string, ItemRequirementIndexEntry>,
  fandomItems: FandomRequirementParseResult[],
) {
  let pagesWithRequirements = 0;
  let parsedRequirementCount = 0;
  let mergedRequirementCount = 0;

  for (const fandomItem of fandomItems) {
    if (fandomItem.requirements.length === 0 && fandomItem.barters.length === 0) continue;
    pagesWithRequirements += 1;
    parsedRequirementCount += fandomItem.requirements.length;
    const existingById = index.get(fandomItem.item.id);
    const existingByName = existingById ?? [...index.values()].find(
      (item) => normalizeName(item.name) === normalizeName(fandomItem.item.name),
    );
    const entry = existingByName ?? {
      id: fandomItem.item.id,
      name: fandomItem.item.name,
      normalizedName: fandomItem.item.normalizedName,
      shortName: fandomItem.item.shortName,
      wikiLink: fandomItem.item.wikiLink,
      requirements: [],
      barters: [],
    };

    entry.shortName = entry.shortName || fandomItem.item.shortName;
    entry.normalizedName = entry.normalizedName || fandomItem.item.normalizedName;
    entry.wikiLink = entry.wikiLink || fandomItem.item.wikiLink;
    index.set(entry.id, entry);

    for (const requirement of fandomItem.requirements) {
      const normalizedRequirement = {
        ...requirement,
        id: entry.id === fandomItem.item.id
          ? requirement.id
          : requirement.id.replace(new RegExp(`:${fandomItem.item.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), `:${entry.id}`),
      };
      if (hasEquivalentRequirement(entry, normalizedRequirement)) continue;
      if (entry.requirements.some((existing) => existing.id === normalizedRequirement.id)) continue;
      entry.requirements.push(normalizedRequirement);
      mergedRequirementCount += 1;
    }

    entry.barters = entry.barters ?? [];
    for (const barter of fandomItem.barters) {
      const normalizedBarter = {
        ...barter,
        id: entry.id === fandomItem.item.id
          ? barter.id
          : barter.id.replace(new RegExp(`:${fandomItem.item.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), `:${entry.id}`),
      };
      if (!entry.barters.some((existing) => existing.id === normalizedBarter.id)) {
        entry.barters.push(normalizedBarter);
      }
    }
  }

  return { pagesWithRequirements, parsedRequirementCount, mergedRequirementCount };
}

async function fandomApi<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(fandomApiUrl);
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': fandomUserAgent, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Fandom API failed ${response.status} ${response.statusText}`);
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFandomItemTitles(rootCategory = 'Category:Items') {
  const seenCategories = new Set<string>();
  const pendingCategories = [rootCategory];
  const titles = new Set<string>();

  while (pendingCategories.length > 0) {
    const category = pendingCategories.shift()!;
    if (seenCategories.has(category)) continue;
    seenCategories.add(category);
    let cmcontinue: string | undefined;
    do {
      const data = await fandomApi<CategoryMembersResponse>({
        action: 'query',
        list: 'categorymembers',
        cmtitle: category,
        cmlimit: '500',
        ...(cmcontinue ? { cmcontinue } : {}),
      });
      for (const member of data.query?.categorymembers ?? []) {
        if (member.ns === 14) pendingCategories.push(member.title);
        if (member.ns === 0) titles.add(member.title);
      }
      cmcontinue = data.continue?.cmcontinue;
    } while (cmcontinue);
  }

  return [...titles].sort((a, b) => a.localeCompare(b));
}

export async function fetchFandomItemPages(titles: string[]) {
  const pages: FandomItemPage[] = [];
  const batchSize = 40;
  for (let index = 0; index < titles.length; index += batchSize) {
    const batch = titles.slice(index, index + batchSize);
    const data = await fandomApi<WikiPageRevisionResponse>({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: batch.join('|'),
    });
    for (const page of data.query?.pages ?? []) {
      const wikitext = page.revisions?.[0]?.slots?.main?.content;
      if (!page.missing && wikitext) pages.push({ title: page.title, wikitext });
    }
  }
  return pages;
}

export async function fetchFandomItemRequirements() {
  const titles = await fetchFandomItemTitles();
  const pages = await fetchFandomItemPages(titles);
  return pages.map(parseFandomItemPage).filter((item): item is FandomRequirementParseResult => Boolean(item));
}
