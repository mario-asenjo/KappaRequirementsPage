import { writeFile } from 'fs/promises';

/**
 * This script demonstrates how you might fetch up‑to‑date quest data from the
 * community API at https://api.tarkov.dev/graphql. It performs a GraphQL
 * query and then writes a simplified representation of Kappa-required tasks
 * into `src/data/tasks.json`. Run it with `npm run update:tasks` from the
 * project root. A modern Node version with native fetch support (v18+) is
 * required.
 */

// GraphQL query requesting tasks with relevant fields. See the API docs for
// more information: https://github.com/the-hideout/tarkov-api
const query = `{
  tasks {
    id
    name
    kappaRequired
    minPlayerLevel
    trader {
      name
    }
    map {
      name
    }
    objectives {
      description
    }
    taskRequirements {
      task {
        name
      }
    }
    wikiLink
  }
}`;

async function fetchTasks() {
  const endpoint = 'https://api.tarkov.dev/graphql';
  const url = `${endpoint}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as any;
  if (Array.isArray(json?.errors) && json.errors.length > 0) {
    throw new Error(`GraphQL error: ${json.errors.map((error: any) => error.message).join('; ')}`);
  }
  const tasks = json?.data?.tasks;
  if (!Array.isArray(tasks)) {
    throw new Error('Unexpected response structure');
  }
  // Keep only quests that currently count toward Kappa to avoid bloating the
  // tracker with unrelated optional quests.
  const mapped = tasks
    .filter((t: any) => Boolean(t.kappaRequired))
    .map((t: any) => ({
      id: t.id,
      title: t.name,
      trader: t.trader?.name || 'Unknown',
      location: t.map?.name || undefined,
      levelRequirement: t.minPlayerLevel || undefined,
      objectives: Array.isArray(t.objectives)
        ? t.objectives.map((o: any) => o.description).filter(Boolean)
        : [],
      description: t.wikiLink ? `Guia externa: ${t.wikiLink}` : undefined,
      rewards: undefined,
      prerequisites: Array.isArray(t.taskRequirements)
        ? t.taskRequirements.map((requirement: any) => requirement.task?.name).filter(Boolean)
        : [],
      countsForKappa: true,
    }))
    .sort((a: any, b: any) => a.trader.localeCompare(b.trader) || a.title.localeCompare(b.title));

  const filePath = new URL('../src/data/tasks.json', import.meta.url).pathname;
  const payload = {
    metadata: {
      source: 'https://api.tarkov.dev/graphql',
      syncedAt: new Date().toISOString(),
      kappaTaskCount: mapped.length,
    },
    tasks: mapped,
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Fetched ${mapped.length} Kappa tasks and wrote to ${filePath}`);
}

fetchTasks().catch((err) => {
  console.error(err);
  process.exit(1);
});
