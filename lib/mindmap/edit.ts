import type { MindmapNode, MindmapPayload } from "@/lib/types/notebook";

export const MINDMAP_NODE_CAP = 60;

export function nextNodeId(nodes: MindmapNode[]): string {
  let max = 0;
  for (const node of nodes) {
    const match = /^n(\d+)$/.exec(node.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `n${max + 1}`;
}

export function descendantsOf(nodes: MindmapNode[], id: string): Set<string> {
  const kids = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = kids.get(node.parentId) ?? [];
    list.push(node.id);
    kids.set(node.parentId, list);
  }
  const found = new Set<string>();
  const stack = [...(kids.get(id) ?? [])];
  while (stack.length) {
    const current = stack.pop()!;
    if (found.has(current)) continue;
    found.add(current);
    stack.push(...(kids.get(current) ?? []));
  }
  return found;
}

export function canReparent(
  nodes: MindmapNode[],
  id: string,
  newParentId: string,
): boolean {
  if (id === newParentId) return false;
  const node = nodes.find((item) => item.id === id);
  const parent = nodes.find((item) => item.id === newParentId);
  if (!node || !parent || node.parentId === null) return false;
  if (descendantsOf(nodes, id).has(newParentId)) return false;
  return true;
}

export function reparentNode(
  nodes: MindmapNode[],
  id: string,
  newParentId: string,
): MindmapNode[] {
  if (!canReparent(nodes, id, newParentId)) return nodes;
  return nodes.map((node) =>
    node.id === id ? { ...node, parentId: newParentId } : node,
  );
}

export function renameNode(
  nodes: MindmapNode[],
  id: string,
  label: string,
): MindmapNode[] {
  const next = label.trim().slice(0, 80);
  if (!next) return nodes;
  return nodes.map((node) => (node.id === id ? { ...node, label: next } : node));
}

export function addChildNode(
  nodes: MindmapNode[],
  parentId: string,
  label = "New idea",
): MindmapNode[] {
  if (nodes.length >= MINDMAP_NODE_CAP) return nodes;
  if (!nodes.some((node) => node.id === parentId)) return nodes;
  return [
    ...nodes,
    { id: nextNodeId(nodes), parentId, label: label.trim().slice(0, 80) || "New idea" },
  ];
}

export function deleteNode(nodes: MindmapNode[], id: string): MindmapNode[] {
  const target = nodes.find((node) => node.id === id);
  if (!target || target.parentId === null) return nodes;
  return nodes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.parentId === id ? { ...node, parentId: target.parentId } : node,
    );
}

export function attachChildLabels(
  nodes: MindmapNode[],
  parentId: string,
  labels: string[],
  mode: "expand" | "rebranch",
): MindmapNode[] {
  if (!nodes.some((node) => node.id === parentId)) return nodes;
  const base = mode === "rebranch"
    ? nodes.filter((node) => !descendantsOf(nodes, parentId).has(node.id))
    : [...nodes];
  const seen = new Set(
    base
      .filter((node) => node.parentId === parentId)
      .map((node) => node.label.trim().toLowerCase()),
  );

  let working = base;
  for (const raw of labels) {
    if (working.length >= MINDMAP_NODE_CAP) break;
    const label = raw.trim().slice(0, 80);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    working = [
      ...working,
      { id: nextNodeId(working), parentId, label },
    ];
  }
  return working;
}

export function serializeMindmap(
  title: string,
  nodes: MindmapNode[],
): MindmapPayload {
  return {
    title: title.trim().slice(0, 100) || "Mind map",
    nodes,
  };
}
