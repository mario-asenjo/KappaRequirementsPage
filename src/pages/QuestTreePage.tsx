import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useLocalStorage from '../hooks/useLocalStorage';
import { Task } from '../types';
import { buildQuestTree, flattenQuestTree, QuestTreeNode } from '../utils/questTree';

interface QuestTreePageProps {
  tasks: Task[];
}

type TreeLayout = 'cartesian' | 'polar';
type TreeOrientation = 'horizontal' | 'vertical';
type LinkType = 'diagonal' | 'step' | 'curve' | 'line';

interface PositionedNode {
  node: QuestTreeNode;
  x: number;
  y: number;
  depth: number;
  order: number;
}

interface TreeLink {
  source: PositionedNode;
  target: PositionedNode;
}

const nodeWidth = 220;
const nodeHeight = 88;
const horizontalGap = 310;
const verticalGap = 132;

const countUniqueNodes = (nodes: QuestTreeNode[]) =>
  new Set(flattenQuestTree(nodes).map((node) => node.task.id)).size;

function layoutTree(nodes: QuestTreeNode[], layout: TreeLayout, orientation: TreeOrientation) {
  const positioned: PositionedNode[] = [];
  const links: TreeLink[] = [];
  let order = 0;

  const walk = (node: QuestTreeNode, depth: number, parent?: PositionedNode) => {
    const current: PositionedNode = {
      node,
      depth,
      order,
      x: orientation === 'horizontal' ? depth * horizontalGap + 80 : order * (nodeWidth + 42) + 80,
      y: orientation === 'horizontal' ? order * verticalGap + 80 : depth * verticalGap + 80,
    };

    order += 1;
    positioned.push(current);
    if (parent) links.push({ source: parent, target: current });
    node.children.forEach((child) => walk(child, depth + 1, current));
  };

  nodes.forEach((node) => walk(node, 0));

  if (layout === 'polar' && positioned.length > 0) {
    const maxDepth = Math.max(...positioned.map((node) => node.depth), 1);
    const centerX = 620;
    const centerY = 620;
    const radiusStep = 520 / (maxDepth + 1);

    positioned.forEach((node) => {
      const angle = positioned.length === 1
        ? 0
        : (node.order / positioned.length) * Math.PI * 2 - Math.PI / 2;
      const radius = (node.depth + 1) * radiusStep;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });
  }

  const maxX = Math.max(...positioned.map((node) => node.x), 0) + nodeWidth + 160;
  const maxY = Math.max(...positioned.map((node) => node.y), 0) + nodeHeight + 160;

  return {
    nodes: positioned,
    links,
    width: layout === 'polar' ? Math.max(maxX, 1280) : maxX,
    height: layout === 'polar' ? Math.max(maxY, 1280) : maxY,
  };
}

function getLinkPath(source: PositionedNode, target: PositionedNode, type: LinkType) {
  const startX = source.x + nodeWidth;
  const startY = source.y + nodeHeight / 2;
  const endX = target.x;
  const endY = target.y + nodeHeight / 2;
  const midX = startX + (endX - startX) / 2;
  const midY = startY + (endY - startY) / 2;

  if (type === 'line') return `M ${startX} ${startY} L ${endX} ${endY}`;
  if (type === 'step') return `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
  if (type === 'curve') return `M ${startX} ${startY} Q ${midX} ${startY} ${midX} ${midY} T ${endX} ${endY}`;
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
}

const QuestTreePage: React.FC<QuestTreePageProps> = ({ tasks }) => {
  const [completedIds, setCompletedIds] = useLocalStorage<string[]>('completedTasks', []);
  const tree = buildQuestTree(tasks, completedIds);
  const [selectedTrader, setSelectedTrader] = useState(tree[0]?.trader ?? '');
  const [layout, setLayout] = useState<TreeLayout>('cartesian');
  const [orientation, setOrientation] = useState<TreeOrientation>('horizontal');
  const [linkType, setLinkType] = useState<LinkType>('diagonal');
  const [zoom, setZoom] = useState(0.86);
  const selectedTree = tree.find((group) => group.trader === selectedTrader) ?? tree[0];
  const completedForTrader = tasks.filter(
    (task) => task.trader === selectedTree?.trader && completedIds.includes(task.id)
  ).length;
  const treeLayout = layoutTree(selectedTree?.roots ?? [], layout, orientation);
  const uniqueNodes = selectedTree ? countUniqueNodes(selectedTree.roots) : 0;

  const toggleCompletion = (task: Task) => {
    setCompletedIds((current) => (
      current.includes(task.id)
        ? current.filter((id) => id !== task.id)
        : [...current, task.id]
    ));
  };

  return (
    <div className="quest-tree-page container-fluid">
      <section className="quest-tree-hero mb-4">
        <div>
          <span className="eyebrow">Quest tree</span>
          <h1>Arbol de misiones Kappa</h1>
          <p>
            Explora la progresion por comerciante, revisa prerequisitos y marca avances
            desde el mismo arbol. El progreso se sincroniza con el tracker existente.
          </p>
        </div>
        <div className="quest-tree-summary" aria-label="Resumen del comerciante seleccionado">
          <span>{selectedTree?.trader}</span>
          <strong>{completedForTrader}/{selectedTree?.totalTasks ?? 0}</strong>
          <small>{uniqueNodes} nodos visibles</small>
        </div>
      </section>

      <section className="quest-tree-controls" aria-label="Controles del arbol de misiones">
        <label>
          Comerciante
          <select
            className="form-select"
            value={selectedTree?.trader ?? ''}
            onChange={(event) => setSelectedTrader(event.target.value)}
          >
            {tree.map((group) => (
              <option key={group.trader} value={group.trader}>{group.trader}</option>
            ))}
          </select>
        </label>
        <label>
          Layout
          <select className="form-select" value={layout} onChange={(event) => setLayout(event.target.value as TreeLayout)}>
            <option value="cartesian">Cartesian</option>
            <option value="polar">Polar</option>
          </select>
        </label>
        <label>
          Orientacion
          <select
            className="form-select"
            value={orientation}
            onChange={(event) => setOrientation(event.target.value as TreeOrientation)}
            disabled={layout === 'polar'}
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
        <label>
          Enlaces
          <select className="form-select" value={linkType} onChange={(event) => setLinkType(event.target.value as LinkType)}>
            <option value="diagonal">Diagonal</option>
            <option value="step">Step</option>
            <option value="curve">Curve</option>
            <option value="line">Line</option>
          </select>
        </label>
        <label>
          Zoom {Math.round(zoom * 100)}%
          <input
            className="form-range"
            type="range"
            min="0.45"
            max="1.35"
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
      </section>

      <div className="quest-tree-stage" role="region" aria-label="Arbol interactivo de misiones" tabIndex={0}>
        <svg
          width={treeLayout.width * zoom}
          height={treeLayout.height * zoom}
          viewBox={`0 0 ${treeLayout.width} ${treeLayout.height}`}
          role="img"
          aria-label={`Arbol de misiones de ${selectedTree?.trader}`}
        >
          <g className="quest-tree-links">
            {treeLayout.links.map((link) => (
              <path
                key={`${link.source.node.task.id}-${link.target.node.task.id}`}
                d={getLinkPath(link.source, link.target, linkType)}
                className={`quest-tree-link is-${link.target.node.status}`}
              />
            ))}
          </g>
          <g>
            {treeLayout.nodes.map(({ node, x, y }) => (
              <foreignObject key={`${node.task.id}-${x}-${y}`} x={x} y={y} width={nodeWidth} height={nodeHeight}>
                <div className={`quest-tree-node is-${node.status}`}>
                  <div className="quest-tree-node-main">
                    <span>Nivel {node.task.levelRequirement ?? 1}</span>
                    <Link to={`/task/${encodeURIComponent(node.task.id)}`}>{node.task.title}</Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCompletion(node.task)}
                    aria-label={`${node.status === 'completed' ? 'Desmarcar' : 'Completar'} ${node.task.title}`}
                  >
                    {node.status === 'completed' ? 'Hecha' : node.status === 'available' ? 'Completar' : 'Bloq.'}
                  </button>
                </div>
              </foreignObject>
            ))}
          </g>
        </svg>
      </div>
      <p className="quest-tree-help">
        Usa el scroll del panel para desplazarte por arboles grandes. Los nodos bloqueados tienen prerequisitos pendientes; los disponibles ya pueden completarse.
      </p>
    </div>
  );
};

export default QuestTreePage;
