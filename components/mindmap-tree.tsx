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

/** Hide grandchildren until a branch is clicked. */
export function defaultCollapsedBranches(nodes: MindmapNode[]): Set<string> {
  const roots = childrenOf(nodes, null);
  const root = roots[0] ?? nodes[0];
  const collapsed = new Set<string>();
  if (!root) return collapsed;
  for (const branch of childrenOf(nodes, root.id)) {
    if (childrenOf(nodes, branch.id).length) collapsed.add(branch.id);
  }
  return collapsed;
}

function separateOverlaps(items: LaidOut[], minDist: number) {
  for (let pass = 0; pass < 4; pass += 1) {
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i]!;
        const b = items[j]!;
        if (!a.parentId || !b.parentId) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= minDist) continue;
        const push = (minDist - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
  }
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
  const ring = Math.max(branches.length, 4);
  const r1 = Math.max(210, 48 * ring);
  const r2 = r1 + 150;
  const r3 = r2 + 140;
  const radius = depth >= 3 ? r3 : r1 + 40;
  const pad = 160;
  const width = Math.max(720, radius * 2 + pad);
  const height = Math.max(520, radius * 2 + 160);
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
      const spread = Math.min(step * 0.78 || Math.PI / 5, Math.PI / 3.4);
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
        const leafSpread = spread * 0.6;
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

  separateOverlaps(items, 118);

  const xs = items.map((item) => item.x);
  const ys = items.map((item) => item.y);
  const minX = Math.min(...xs, cx) - 90;
  const maxX = Math.max(...xs, cx) + 90;
  const minY = Math.min(...ys, cy) - 70;
  const maxY = Math.max(...ys, cy) + 70;
  const shiftX = minX < 0 ? -minX + 16 : 0;
  const shiftY = minY < 0 ? -minY + 16 : 0;
  if (shiftX || shiftY) {
    for (const item of items) {
      item.x += shiftX;
      item.y += shiftY;
    }
  }

  return {
    width: Math.max(width, maxX + shiftX + 24),
    height: Math.max(height, maxY + shiftY + 24),
    cx: cx + shiftX,
    cy: cy + shiftY,
    items,
  };
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
  const nodeKey = nodes.map((node) => node.id).join(",");
  const [mapKey, setMapKey] = useState(nodeKey);
  const [collapsed, setCollapsed] = useState(() => defaultCollapsedBranches(nodes));
  const [expandAll, setExpandAll] = useState(false);

  if (mapKey !== nodeKey) {
    setMapKey(nodeKey);
    setCollapsed(defaultCollapsedBranches(nodes));
    setExpandAll(false);
  }

  const layout = useMemo(
    () => layoutMindmap(nodes, collapsed, expandAll),
    [nodes, collapsed, expandAll],
  );
  const byId = useMemo(
    () => new Map(layout.items.map((item) => [item.id, item])),
    [layout.items],
  );

  function toggle(id: string) {
    setExpandAll(false);
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
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            className="secondary-button"
            onClick={() => {
              if (expandAll) {
                setExpandAll(false);
                setCollapsed(defaultCollapsedBranches(nodes));
              } else {
                setExpandAll(true);
              }
            }}
            type="button"
          >
            {expandAll ? t("collapseBranches") : t("expandAll")}
          </button>
          <button className="secondary-button" onClick={printMap} type="button">
            {t("printMap")}
          </button>
        </div>
      </div>
      <p className="mindmap-hint no-print">{t("expandHint")}</p>
      <div className="mindmap-canvas mt-3">
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
              title={item.label}
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
