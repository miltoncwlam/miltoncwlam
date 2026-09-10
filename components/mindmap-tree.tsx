"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { MindmapNode } from "@/lib/types/notebook";

const BRANCH_PASTELS = [
  { fill: "#f8c4c0", ink: "#5c2e2c" },
  { fill: "#fde2c4", stroke: "#c48a3a", ink: "#5c3d16" },
  { fill: "#cfe8d4", ink: "#215544" },
  { fill: "#d9c8f0", ink: "#3d2a63" },
  { fill: "#c5e4f5", ink: "#21556a" },
  { fill: "#f5d4e4", ink: "#6a2a4a" },
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
  ink: string;
  parentId: string | null;
  hasKids: boolean;
  isRoot: boolean;
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

/** Used when the learner taps Collapse. */
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

function columnHeight(
  nodes: MindmapNode[],
  branch: MindmapNode,
  collapsed: Set<string>,
  expandAll: boolean,
) {
  const kids = visibleChildren(nodes, branch.id, collapsed, expandAll);
  if (!kids.length) return 72;
  let height = 72;
  for (const kid of kids) {
    const grand = visibleChildren(nodes, kid.id, collapsed, expandAll);
    height += Math.max(56, grand.length * 48);
  }
  return height;
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
  const left = branches.filter((_, index) => index % 2 === 1);
  const right = branches.filter((_, index) => index % 2 === 0);
  const BRANCH_GAP = 28;
  const CHILD_H = 56;
  const ROOT_X = 230;
  const CHILD_X = 190;
  const GRAND_X = 170;

  function sideSpan(list: MindmapNode[]) {
    return list.reduce(
      (sum, branch) => sum + columnHeight(nodes, branch, collapsed, expandAll) + BRANCH_GAP,
      0,
    );
  }

  const height = Math.max(520, Math.max(sideSpan(left), sideSpan(right), 180) + 140);
  const width = Math.max(960, 1080);
  const cx = width / 2;
  const cy = height / 2;
  const items: LaidOut[] = [];
  const hasRootKids = childrenOf(nodes, root.id).length > 0;

  items.push({
    id: root.id,
    label: root.label,
    x: cx,
    y: cy,
    color: "#c4b5e8",
    ink: "#2d2150",
    parentId: null,
    hasKids: hasRootKids,
    isRoot: true,
  });

  function placeSide(list: MindmapNode[], dir: -1 | 1) {
    let y = cy - sideSpan(list) / 2;
    list.forEach((branch) => {
      const palette =
        BRANCH_PASTELS[
          branches.findIndex((item) => item.id === branch.id) % BRANCH_PASTELS.length
        ]!;
      const block = columnHeight(nodes, branch, collapsed, expandAll);
      const by = y + block / 2;
      const bx = cx + dir * ROOT_X;
      const kids = visibleChildren(nodes, branch.id, collapsed, expandAll);
      items.push({
        id: branch.id,
        label: branch.label,
        x: bx,
        y: by,
        color: palette.fill,
        ink: palette.ink ?? "#14201b",
        parentId: root.id,
        hasKids: childrenOf(nodes, branch.id).length > 0,
        isRoot: false,
      });

      let kidY = by - ((kids.length - 1) * CHILD_H) / 2;
      kids.forEach((kid) => {
        const kx = bx + dir * CHILD_X;
        const grand = visibleChildren(nodes, kid.id, collapsed, expandAll);
        const ky = kidY;
        items.push({
          id: kid.id,
          label: kid.label,
          x: kx,
          y: ky,
          color: palette.fill,
          ink: palette.ink ?? "#14201b",
          parentId: branch.id,
          hasKids: childrenOf(nodes, kid.id).length > 0,
          isRoot: false,
        });
        grand.forEach((leaf, leafIndex) => {
          items.push({
            id: leaf.id,
            label: leaf.label,
            x: kx + dir * GRAND_X,
            y: ky + (leafIndex - (grand.length - 1) / 2) * 48,
            color: palette.fill,
            ink: palette.ink ?? "#14201b",
            parentId: kid.id,
            hasKids: false,
            isRoot: false,
          });
        });
        kidY += CHILD_H;
      });
      y += block + BRANCH_GAP;
    });
  }

  placeSide(left, -1);
  placeSide(right, 1);

  return { width, height, cx, cy, items };
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const qx = mx + (y1 - y2) * 0.12;
  const qy = my + (x2 - x1) * 0.08;
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
  const [collapsed, setCollapsed] = useState(() => new Set<string>());
  const [expandAll, setExpandAll] = useState(true);

  if (mapKey !== nodeKey) {
    setMapKey(nodeKey);
    setCollapsed(new Set());
    setExpandAll(true);
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
        setExpandAll(true);
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
                setCollapsed(new Set());
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
            <defs>
              <marker
                id="mindmap-arrow"
                markerHeight="7"
                markerWidth="7"
                orient="auto"
                refX="6"
                refY="3.5"
                viewBox="0 0 8 7"
              >
                <path d="M0 0 L8 3.5 L0 7 Z" fill="#2d3a36" />
              </marker>
            </defs>
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
                    markerEnd="url(#mindmap-arrow)"
                    stroke="#2d3a36"
                    strokeLinecap="round"
                    strokeWidth={item.parentId === layout.items[0]?.id ? 3 : 2}
                  />
                );
              })}
          </svg>
          {layout.items.map((item) => (
            <button
              className={`mindmap-node ${item.isRoot ? "is-root" : ""}`}
              key={item.id}
              onClick={() => {
                if (item.hasKids) toggle(item.id);
              }}
              style={{
                left: item.x,
                top: item.y,
                borderColor: "transparent",
                background: item.color,
                color: item.ink,
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
