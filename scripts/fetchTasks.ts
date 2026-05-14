import { writeFile } from 'fs/promises';

/**
 * This script demonstrates how you might fetch up‑to‑date quest data from the
 * community API at https://api.tarkov.dev/graphql. It performs a GraphQL
 * query and then writes a simplified representation of the tasks into
 * `src/data/tasks.json`. The API schema may change over time, so you should
 * adjust the query and mapping logic accordingly. To execute this script
 * run `node scripts/fetchTasks.ts` from the project root. A modern Node
 * version with native fetch support (v18+) is required.
 */

// GraphQL query requesting tasks with relevant fields. See the API docs for
// more information: https://github.com/the-hideout/tarkov-api
const query = `{
  tasks {
    id
    name
    kappaRequired
    trader {
      name
    }
    objectives {
      description
    }
    prerequisites {
      id
      name
    }
    description
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
  const tasks = json?.data?.tasks;
  if (!Array.isArray(tasks)) {
    throw new Error('Unexpected response structure');
  }
  // Map API tasks to the local Task interface format
  const mapped = tasks.map((t: any) => ({
    id: t.id,
    title: t.name,
    trader: t.trader?.name || 'Unknown',
    location: undefined,
    objectives: Array.isArray(t.objectives)
      ? t.objectives.map((o: any) => o.description)
      : [],
    description: t.description || undefined,
    rewards: undefined,
    prerequisites: Array.isArray(t.prerequisites)
      ? t.prerequisites.map((p: any) => p.name)
      : [],
    countsForKappa: Boolean(t.kappaRequired),
  }));
  // Write to tasks.json
  const filePath = new URL('../src/data/tasks.json', import.meta.url).pathname;
  await writeFile(filePath, JSON.stringify({ tasks: mapped }, null, 2), 'utf8');
  console.log(`Fetched ${mapped.length} tasks and wrote to ${filePath}`);
}

fetchTasks().catch((err) => {
  console.error(err);
  process.exit(1);
});
