import { Task } from '../types';

const sortByTraderAndTitle = (a: Task, b: Task) =>
  a.trader.localeCompare(b.trader) || a.title.localeCompare(b.title);

export function sortTasksByGameOrder(tasks: Task[]) {
  const sortedTasks = [...tasks].sort(sortByTraderAndTitle);
  const tasksByTitle = new Map(sortedTasks.map((task) => [task.title, task]));
  const ordered: Task[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (task: Task) => {
    if (visited.has(task.id) || visiting.has(task.id)) return;

    visiting.add(task.id);
    task.prerequisites
      ?.map((title) => tasksByTitle.get(title))
      .filter((prerequisite): prerequisite is Task => Boolean(prerequisite))
      .sort(sortByTraderAndTitle)
      .forEach(visit);
    visiting.delete(task.id);
    visited.add(task.id);
    ordered.push(task);
  };

  sortedTasks.forEach(visit);

  return ordered;
}
