"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { MindmapNode } from "@/lib/types/notebook";

const BRANCH_COLORS = [
  "#0f766e",
  "#b45309",
  "#7c3aed",
  "#0369a1",
  "#be185d",
  "#15803d",
  "#c2410c",
];

function childrenOf(nodes: MindmapNode[], parentId: string | null) {
  return nodes.filter((node) => node.parentId === parentId);
}

type LaidOut = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  parentId: string | null;
  hasKids: boolean;
};

function visibleChildren(
  nodes: MindmapNode[],
  parentId: string,
  collapsed: Set<string>,
  expandAll: boolean,
) {
  if (!expandAll && collapsed.has(parentId)) return [];
  return childrenOf(nodes, parentId);
}

export function layoutMindmap(
  nodes: MindmapNode[],
  collapsed: Set<string>,
  expandAll = false,
) {
  const roots = childrenOf(nodes, null);
  const root = roots[0] ?? nodes[0];
  if (!root) {
    return { width: 640, height: 420, cx: 320, cy: 210, items: [] as LaidOut[] };
  }

  const branches = visibleChildren(nodes, root.id, collapsed, expandAll);
  const depth = branches.some((branch) =>
    visibleChildren(nodes, branch.id, collapsed, expandAll).length,
  )
    ? 3
    : 2;
  const r1 = 168;
  const r2 = 292;
  const r3 = 400;
  const radius = depth >= 3 ? r3 : r2;
  const width = Math.max(720, radius * 2 + 180);
  const height = Math.max(520, radius * 2 + 140);
  const cx = width / 2;
  const cy = height / 2;
  const items: LaidOut[] = [];
  const hasRootKids = childrenOf(nodes, root.id).length > 0;

  items.push({
    id: root.id,
    label: root.label,
    x: cx,
    y: cy,
    color: "#134e4a",
    parentId: null,
    hasKids: hasRootKids,
  });

  const step = branches.length ? (Math.PI * 2) / branches.length : 0;
  const start = -Math.PI / 2;

  branches.forEach((branch, index) => {
    const angle = start + index * step;
    const color = BRANCH_COLORS[index % BRANCH_COLORS.length];
    const bx = cx + Math.cos(angle) * r1;
    const by = cy + Math.sin(angle) * r1;
    const kids = visibleChildren(nodes, branch.id, collapsed, expandAll);
    items.push({
      id: branch.id,
      label: branch.label,
      x: bx,
      y: by,
      color,
      parentId: root.id,
      hasKids: childrenOf(nodes, branch.id).length > 0,
    });

    kids.forEach((kid, kidIndex) => {
      const spread = Math.min(step * 0.72 || Math.PI / 5, Math.PI / 4);
      const ka =
        kids.length === 1
          ? angle
          : angle - spread / 2 + (kidIndex / Math.max(1, kids.length - 1)) * spread;
      const kx = cx + Math.cos(ka) * r2;
      const ky = cy + Math.sin(ka) * r2;
      const grand = visibleChildren(nodes, kid.id, collapsed, expandAll);
      items.push({
        id: kid.id,
        label: kid.label,
        x: kx,
        y: ky,
        color,
        parentId: branch.id,
        hasKids: childrenOf(nodes, kid.id).length > 0,
      });

      grand.forEach((leaf, leafIndex) => {
        const leafSpread = spread * 0.55;
        const la =
          grand.length === 1
            ? ka
            : ka -
              leafSpread / 2 +
              (leafIndex / Math.max(1, grand.length - 1)) * leafSpread;
        items.push({
          id: leaf.id,
          label: leaf.label,
          x: cx + Math.cos(la) * r3,
          y: cy + Math.sin(la) * r3,
          color,
          parentId: kid.id,
          hasKids: false,
        });
      });
    });
  });

  return { width, height, cx, cy, items };
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const qx = mx + (y1 - y2) * 0.18;
  const qy = my + (x2 - x1) * 0.18;
  return `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`;
}

export function MindmapTree({
  title,
  nodes,
}: {
  title: string;
  nodes: MindmapNode[];
}) {
  const t = useTranslations("studio");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const layout = useMemo(
    () => layoutMindmap(nodes, collapsed, expandAll),
    [nodes, collapsed, expandAll],
  );
  const byId = useMemo(
    () => new Map(layout.items.map((item) => [item.id, item])),
    [layout.items],
  );

  function toggle(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function printMap() {
    setExpandAll(true);
    document.body.dataset.print = "mindmap";
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        delete document.body.dataset.print;
        setExpandAll(false);
      }, 400);
    }, 50);
  }

  return (
    <section className="mindmap-tree">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">{title}</h2>
        <button className="secondary-button no-print" onClick={printMap} type="button">
          {t("printMap")}
        </button>
      </div>
      <div className="mindmap-canvas mt-4">
        <div
          className="mindmap-stage"
          style={{ width: layout.width, height: layout.height }}
        >
          <svg
            aria-hidden
            className="mindmap-spokes"
            height={layout.height}
            width={layout.width}
          >
            {layout.items
              .filter((item) => item.parentId && byId.get(item.parentId))
              .map((item) => {
                const parent = byId.get(item.parentId!);
                if (!parent) return null;
                return (
                  <path
                    d={curve(parent.x, parent.y, item.x, item.y)}
                    fill="none"
                    key={`${parent.id}-${item.id}`}
                    stroke={item.color}
                    strokeLinecap="round"
                    strokeWidth={item.parentId === layout.items[0]?.id ? 3 : 2}
                  />
                );
              })}
          </svg>
          {layout.items.map((item) => (
            <button
              className={`mindmap-node ${item.parentId ? "" : "is-root"}`}
              key={item.id}
              onClick={() => {
                if (item.hasKids) toggle(item.id);
              }}
              style={{
                left: item.x,
                top: item.y,
                borderColor: item.color,
                background: item.parentId ? "var(--paper)" : item.color,
                color: item.parentId ? "var(--ink)" : "#fff",
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
