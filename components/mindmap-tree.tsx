"use client";

import type { MindmapNode } from "@/lib/types/notebook";

function childrenOf(nodes: MindmapNode[], parentId: string | null) {
  return nodes.filter((node) => node.parentId === parentId);
}

function Branch({
  node,
  nodes,
  depth,
}: {
  node: MindmapNode;
  nodes: MindmapNode[];
  depth: number;
}) {
  const kids = childrenOf(nodes, node.id);
  if (!kids.length) {
    return <li className="mindmap-leaf">{node.label}</li>;
  }
  return (
    <li>
      <details className="mindmap-branch" open={depth < 2}>
        <summary>{node.label}</summary>
        <ul>
          {kids.map((child) => (
            <Branch depth={depth + 1} key={child.id} node={child} nodes={nodes} />
          ))}
        </ul>
      </details>
    </li>
  );
}

export function MindmapTree({
  title,
  nodes,
}: {
  title: string;
  nodes: MindmapNode[];
}) {
  const roots = childrenOf(nodes, null);
  const start = roots.length ? roots : nodes.slice(0, 1);
  return (
    <section className="mindmap-tree">
      <h2 className="text-xl font-black">{title}</h2>
      <ul className="mt-4">
        {start.map((node) => (
          <Branch depth={0} key={node.id} node={node} nodes={nodes} />
        ))}
      </ul>
    </section>
  );
}
