import { Task } from '../types';

export type QuestTreeStatus = 'completed' | 'available' | 'locked';

export interface QuestTreeNode {
  task: Task;
  status: QuestTreeStatus;
  children: QuestTreeNode[];
  crossTraderPrerequisites: string[];
}

export interface QuestTreeGroup {
  trader: string;
  roots: QuestTreeNode[];
  totalTasks: number;
}

const sortByLevelAndTitle = (a: Task, b: Task) =>
  (a.levelRequirement ?? 0) - (b.levelRequirement ?? 0) || a.title.localeCompare(b.title);

const normalize = (value: string) => value.trim().toLowerCase();

export function getTaskPrerequisites(task: Task) {
  return task.prerequisites?.filter(Boolean) ?? [];
}

export function getQuestStatus(
  task: Task,
  completedIds: string[],
  tasksByNameOrId: Map<string, Task>,
  playerLevel = 79
) {
  if (completedIds.includes(task.id)) return 'completed';

  if ((task.levelRequirement ?? 1) > playerLevel) return 'locked';

  const prerequisites = getTaskPrerequisites(task)
    .map((nameOrId) => tasksByNameOrId.get(normalize(nameOrId)))
    .filter((prerequisite): prerequisite is Task => Boolean(prerequisite));

  const prerequisitesCompleted = prerequisites.every((prerequisite) => completedIds.includes(prerequisite.id));
  if (!prerequisitesCompleted) return 'locked';

  return 'available';
}

export function buildQuestTree(tasks: Task[], completedIds: string[] = [], playerLevel = 79): QuestTreeGroup[] {
  const tasksByNameOrId = new Map<string, Task>();
  tasks.forEach((task) => {
    tasksByNameOrId.set(normalize(task.id), task);
    tasksByNameOrId.set(normalize(task.title), task);
  });

  const traders = Array.from(new Set(tasks.map((task) => task.trader))).sort();

  return traders.map((trader) => {
    const traderTasks = tasks.filter((task) => task.trader === trader).sort(sortByLevelAndTitle);
    const traderTaskIds = new Set(traderTasks.map((task) => task.id));
    const childrenByParentId = new Map<string, Task[]>();
    const childIds = new Set<string>();

    traderTasks.forEach((task) => {
      getTaskPrerequisites(task).forEach((prerequisiteNameOrId) => {
        const prerequisite = tasksByNameOrId.get(normalize(prerequisiteNameOrId));
        if (!prerequisite || !traderTaskIds.has(prerequisite.id)) return;

        childIds.add(task.id);
        const siblings = childrenByParentId.get(prerequisite.id) ?? [];
        siblings.push(task);
        childrenByParentId.set(prerequisite.id, siblings.sort(sortByLevelAndTitle));
      });
    });

    const createNode = (task: Task, path = new Set<string>()): QuestTreeNode => {
      const nextPath = new Set(path).add(task.id);
      const children = (childrenByParentId.get(task.id) ?? [])
        .filter((child) => !nextPath.has(child.id))
        .map((child) => createNode(child, nextPath));
      const crossTraderPrerequisites = getTaskPrerequisites(task).filter((prerequisiteNameOrId) => {
        const prerequisite = tasksByNameOrId.get(normalize(prerequisiteNameOrId));
        return prerequisite ? prerequisite.trader !== trader : true;
      });

      return {
        task,
        status: getQuestStatus(task, completedIds, tasksByNameOrId, playerLevel),
        children,
        crossTraderPrerequisites,
      };
    };

    return {
      trader,
      roots: traderTasks
        .filter((task) => !childIds.has(task.id))
        .map((task) => createNode(task)),
      totalTasks: traderTasks.length,
    };
  });
}

export function getValidCompletedTaskIds(tasks: Task[], completedIds: string[], playerLevel = 79) {
  const completedSet = new Set(completedIds);
  const validCompleted = new Set<string>();
  const tasksByNameOrId = new Map<string, Task>();

  tasks.forEach((task) => {
    tasksByNameOrId.set(normalize(task.id), task);
    tasksByNameOrId.set(normalize(task.title), task);
  });

  let changed = true;
  while (changed) {
    changed = false;
    tasks.forEach((task) => {
      if (!completedSet.has(task.id) || validCompleted.has(task.id)) return;
      if ((task.levelRequirement ?? 1) > playerLevel) return;

      const prerequisites = getTaskPrerequisites(task)
        .map((nameOrId) => tasksByNameOrId.get(normalize(nameOrId)))
        .filter((prerequisite): prerequisite is Task => Boolean(prerequisite));
      const prerequisitesCompleted = prerequisites.every((prerequisite) => validCompleted.has(prerequisite.id));

      if (!prerequisitesCompleted) return;
      validCompleted.add(task.id);
      changed = true;
    });
  }

  return completedIds.filter((id) => validCompleted.has(id));
}

export function flattenQuestTree(nodes: QuestTreeNode[]) {
  const flattened: QuestTreeNode[] = [];
  const walk = (node: QuestTreeNode) => {
    flattened.push(node);
    node.children.forEach(walk);
  };

  nodes.forEach(walk);
  return flattened;
}
