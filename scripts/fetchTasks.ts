import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';

/**
 * This script demonstrates how you might fetch up‑to‑date quest data from the
 * community API at https://api.tarkov.dev/graphql. It performs a GraphQL
 * query and then writes a simplified representation of all known tasks
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
    lightkeeperRequired
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
    finishRewards {
      achievement {
        id
        name
      }
    }
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
  const mapped = tasks
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
      countsForKappa: Boolean(t.kappaRequired),
      lightkeeperRequired: Boolean(t.lightkeeperRequired),
      achievementRewards: Array.isArray(t.finishRewards?.achievement)
        ? t.finishRewards.achievement.map((achievement: any) => ({
          id: achievement.id,
          name: achievement.name,
        })).filter((achievement: any) => achievement.id && achievement.name)
        : [],
    }))
    .sort((a: any, b: any) => a.trader.localeCompare(b.trader) || a.title.localeCompare(b.title));

  const filePath = fileURLToPath(new URL('../src/data/tasks.json', import.meta.url));
  const payload = {
    metadata: {
      source: 'https://api.tarkov.dev/graphql',
      syncedAt: new Date().toISOString(),
      taskCount: mapped.length,
      kappaTaskCount: mapped.filter((task: any) => task.countsForKappa).length,
      lightkeeperTaskCount: mapped.filter((task: any) => task.lightkeeperRequired).length,
    },
    tasks: mapped,
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Fetched ${mapped.length} tasks and wrote to ${filePath}`);
}

fetchTasks().catch((err) => {
  console.error(err);
  process.exit(1);
});
