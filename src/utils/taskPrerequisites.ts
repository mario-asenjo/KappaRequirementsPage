import { Task } from '../types';

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Prerequisite references of a task. Uses ids from the structured source when
 * available (titles are not unique: BEAR/USEC variants share names) and falls
 * back to titles for older data.
 */
export function getPrerequisiteRefs(task: Task): string[] {
  if (task.prerequisiteIds?.length) return task.prerequisiteIds.map((prerequisite) => prerequisite.id);
  return task.prerequisites?.filter(Boolean) ?? [];
}

export function buildTaskLookup(tasks: Task[]) {
  const lookup = new Map<string, Task>();
  tasks.forEach((task) => {
    lookup.set(normalize(task.id), task);
    lookup.set(normalize(task.title), task);
  });
  return lookup;
}

export function getTaskPrerequisiteChain(task: Task, tasks: Task[]) {
  const lookup = buildTaskLookup(tasks);
  const chain: Task[] = [];
  const visited = new Set<string>();

  const walk = (current: Task) => {
    getPrerequisiteRefs(current).forEach((nameOrId) => {
      const prerequisite = lookup.get(normalize(nameOrId));
      if (!prerequisite || visited.has(prerequisite.id)) return;

      visited.add(prerequisite.id);
      walk(prerequisite);
      chain.push(prerequisite);
    });
  };

  walk(task);
  return chain;
}

export function getCompletionIdsWithPrerequisites(task: Task, tasks: Task[], completedIds: string[]) {
  const completed = new Set(completedIds);
  getTaskPrerequisiteChain(task, tasks).forEach((prerequisite) => completed.add(prerequisite.id));
  completed.add(task.id);
  return Array.from(completed);
}
