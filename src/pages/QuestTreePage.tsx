import React from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Task } from '../types';
import { buildQuestTree, QuestTreeGroup, QuestTreeNode } from '../utils/questTree';

interface QuestTreePageProps {
  tasks: Task[];
}

interface TreePoint {
  x: number;
  y: number;
}

interface DrawableNode extends TreePoint {
  id: string;
  label: string;
  level?: number;
  status: QuestTreeNode['status'] | 'trader';
  task?: Task;
  crossTraderPrerequisiteCount?: number;
}

interface DrawableLink {
  source: TreePoint;
  target: TreePoint;
  status: QuestTreeNode['status'];
}

const traderOrder = ['Prapor', 'Therapist', 'Skier', 'Peacekeeper', 'Mechanic', 'Ragman', 'Jaeger', 'Fence'];
const nodeWidth = 150;
const nodeHeight = 38;
const xGap = 190;
const yGap = 72;
const topPadding = 76;
const leftPadding = 62;

const traderAccents: Record<string, string> = {
  Prapor: '41, 101, 204',
  Therapist: '41, 166, 52',
  Skier: '217, 158, 11',
  Peacekeeper: '209, 57, 19',
  Mechanic: '143, 57, 143',
  Ragman: '0, 179, 164',
  Jaeger: '219, 44, 111',
  Fence: '150, 98, 45',
};

const getAccent = (trader: string) => traderAccents[trader] ?? '113, 50, 245';

const sortGroups = (groups: QuestTreeGroup[]) => [...groups].sort((a, b) => {
  const indexA = traderOrder.indexOf(a.trader);
  const indexB = traderOrder.indexOf(b.trader);
  return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA)
    - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB)
    || a.trader.localeCompare(b.trader);
});

const wrapQuestName = (label: string) => {
  const cleanLabel = label.replace(' - ', ' ');
  if (cleanLabel.length <= 18) return [cleanLabel];

  const words = cleanLabel.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > 16 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }
    currentLine = nextLine;
  });

  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 2);
};

function getSubtreeLeafCount(node: QuestTreeNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((total, child) => total + getSubtreeLeafCount(child), 0);
}

function layoutTraderTree(group: QuestTreeGroup) {
  const nodes: DrawableNode[] = [];
  const links: DrawableLink[] = [];
  let leafCursor = 0;
  let maxDepth = 0;

  const placeNode = (node: QuestTreeNode, depth: number): TreePoint => {
    maxDepth = Math.max(maxDepth, depth);
    const childPoints = node.children.map((child) => placeNode(child, depth + 1));
    const y = childPoints.length > 0
      ? childPoints.reduce((sum, point) => sum + point.y, 0) / childPoints.length
      : topPadding + leafCursor++ * yGap;
    const point = {
      x: leftPadding + depth * xGap,
      y,
    };

    nodes.push({
      ...point,
      id: node.task.id,
      label: node.task.title,
      level: node.task.levelRequirement ?? 1,
      status: node.status,
      task: node.task,
      crossTraderPrerequisiteCount: node.crossTraderPrerequisites.length,
    });

    childPoints.forEach((childPoint, index) => {
      links.push({ source: point, target: childPoint, status: node.children[index].status });
    });

    return point;
  };

  const rootTasks = [...group.roots].sort((a, b) => getSubtreeLeafCount(b) - getSubtreeLeafCount(a));
  const rootPoints = rootTasks.map((node) => placeNode(node, 1));
  const traderY = rootPoints.length > 0
    ? rootPoints.reduce((sum, point) => sum + point.y, 0) / rootPoints.length
    : topPadding;
  const traderPoint = { x: leftPadding, y: traderY };

  nodes.push({
    ...traderPoint,
    id: `trader-${group.trader}`,
    label: group.trader,
    status: 'trader',
  });

  rootPoints.forEach((rootPoint) => {
    links.push({ source: traderPoint, target: rootPoint, status: 'available' });
  });

  return {
    nodes,
    links,
    width: Math.max(460, leftPadding * 2 + (maxDepth + 1) * xGap + nodeWidth),
    height: Math.max(180, topPadding * 2 + Math.max(leafCursor, 1) * yGap),
  };
}

function getPath(source: TreePoint, target: TreePoint) {
  const startX = source.x + nodeWidth / 2;
  const startY = source.y;
  const endX = target.x - nodeWidth / 2;
  const endY = target.y;
  const midX = startX + (endX - startX) / 2;

  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
}

const QuestTreePage: React.FC<QuestTreePageProps> = ({ tasks }) => {
  const [completedIds, setCompletedIds] = useLocalStorage<string[]>('completedTasks', []);
  const groups = sortGroups(buildQuestTree(tasks, completedIds));
  const completedCount = tasks.filter((task) => completedIds.includes(task.id)).length;

  const toggleCompletion = (task: Task) => {
    setCompletedIds((current) => (
      current.includes(task.id)
        ? current.filter((id) => id !== task.id)
        : [...current, task.id]
    ));
  };

  const handleNodeKeyDown = (event: React.KeyboardEvent<SVGGElement>, task?: Task) => {
    if (!task || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    toggleCompletion(task);
  };

  return (
    <div className="quest-tree-page container-fluid">
      <section className="quest-tree-hero quest-tree-hero--compact mb-4">
        <div>
          <span className="eyebrow">Quest tree</span>
          <h1>Arbol de misiones Kappa</h1>
          <p>
            Vista global por comerciante inspirada en eft.monster: secciones horizontales,
            lineas de progreso y nodos compactos con nivel minimo.
          </p>
        </div>
        <div className="quest-tree-legend" aria-label="Leyenda de estados">
          <span><i className="is-completed"></i> Completada</span>
          <span><i className="is-available"></i> Disponible</span>
          <span><i className="is-locked"></i> Bloqueada</span>
          <strong>{completedCount}/{tasks.length}</strong>
        </div>
      </section>

      <div className="quest-tree-stack" aria-label="Arboles de misiones por comerciante">
        {groups.map((group) => {
          const layout = layoutTraderTree(group);
          const accent = getAccent(group.trader);
          const completedForTrader = tasks.filter(
            (task) => task.trader === group.trader && completedIds.includes(task.id)
          ).length;

          return (
            <section
              key={group.trader}
              className="quest-tree-trader-section"
              style={{ '--trader-accent': accent } as React.CSSProperties}
              aria-labelledby={`quest-tree-${group.trader}`}
            >
              <div className="quest-tree-trader-heading">
                <div>
                  <span className="quest-tree-trader-mark">{group.trader.slice(0, 2).toUpperCase()}</span>
                  <h2 id={`quest-tree-${group.trader}`}>{group.trader}</h2>
                </div>
                <p>{completedForTrader}/{group.totalTasks} completadas</p>
              </div>
              <div className={`quest-tree-scroll scroll-container-${group.trader}`} tabIndex={0}>
                <svg
                  width={layout.width}
                  height={layout.height}
                  viewBox={`0 0 ${layout.width} ${layout.height}`}
                  role="img"
                  aria-label={`Arbol de misiones de ${group.trader}`}
                >
                  <g className="quest-tree-links">
                    {layout.links.map((link, index) => (
                      <path
                        key={`${group.trader}-link-${index}`}
                        d={getPath(link.source, link.target)}
                        className={`quest-tree-link is-${link.status}`}
                      />
                    ))}
                  </g>
                  <g>
                    {layout.nodes.map((node) => {
                      const lines = wrapQuestName(node.label);
                      const isTrader = node.status === 'trader';

                      return (
                        <g
                          key={node.id}
                          className={`quest-tree-node-svg is-${node.status}`}
                          transform={`translate(${node.x}, ${node.y})`}
                          role={node.task ? 'button' : 'img'}
                          tabIndex={node.task ? 0 : undefined}
                          aria-label={node.task ? `${node.label}, nivel ${node.level}, ${node.status}` : group.trader}
                          onClick={() => node.task && toggleCompletion(node.task)}
                          onKeyDown={(event) => handleNodeKeyDown(event, node.task)}
                        >
                          <title>{node.task ? `${node.label} - nivel ${node.level}` : group.trader}</title>
                          <rect
                            x={-nodeWidth / 2}
                            y={-nodeHeight / 2}
                            width={nodeWidth}
                            height={nodeHeight}
                            rx={isTrader ? 18 : 4}
                          />
                          {node.level && !isTrader && (
                            <text className="quest-tree-level" x={-nodeWidth / 2 - 12} y={5} textAnchor="end">
                              {node.level}
                            </text>
                          )}
                          {lines.map((line, index) => (
                            <text
                              key={`${node.id}-${line}`}
                              className="quest-tree-label"
                              y={lines.length === 1 ? 5 : -3 + index * 15}
                              textAnchor="middle"
                            >
                              {line}
                            </text>
                          ))}
                          {Boolean(node.crossTraderPrerequisiteCount) && (
                            <text className="quest-tree-cross-prereq" x={nodeWidth / 2 - 8} y={-nodeHeight / 2 + 13} textAnchor="end">
                              +{node.crossTraderPrerequisiteCount}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            </section>
          );
        })}
      </div>
      <p className="quest-tree-help">
        Desplazate horizontalmente dentro de cada comerciante. Pulsa Enter, Espacio o click en una mision para alternar completada.
      </p>
    </div>
  );
};

export default QuestTreePage;
