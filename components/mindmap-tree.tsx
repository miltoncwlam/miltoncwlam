"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  addChildNode,
  deleteNode,
  renameNode,
  reparentNode,
} from "@/lib/mindmap/edit";
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
  w: number;
  h: number;
  color: string;
  ink: string;
  parentId: string | null;
  hasKids: boolean;
  isRoot: boolean;
};

function textUnits(label: string) {
  let units = 0;
  for (const char of label) {
    if (char === " ") units += 4;
    else if (/[\u2e80-\u9fff\uac00-\ud7af\u3040-\u30ff]/.test(char)) units += 15;
    else units += 7.4;
  }
  return units;
}

function measureLabel(label: string, isRoot: boolean) {
  const maxInner = isRoot ? 156 : 136;
  const units = Math.max(24, textUnits(label));
  const lines = Math.min(4, Math.max(1, Math.ceil(units / maxInner)));
  const inner = Math.min(maxInner, units);
  return {
    w: Math.max(isRoot ? 132 : 108, Math.ceil(inner + 28)),
    h: lines * (isRoot ? 22 : 18) + (isRoot ? 28 : 22),
  };
}

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

type Prepared = {
  node: MindmapNode;
  w: number;
  h: number;
  kids: Prepared[];
  subtreeH: number;
  hasKids: boolean;
};

const SIBLING_GAP = 16;
const BRANCH_GAP = 28;

function prepareNode(
  nodes: MindmapNode[],
  node: MindmapNode,
  collapsed: Set<string>,
  expandAll: boolean,
  isRoot: boolean,
): Prepared {
  const size = measureLabel(node.label, isRoot);
  const kids = visibleChildren(nodes, node.id, collapsed, expandAll).map((child) =>
    prepareNode(nodes, child, collapsed, expandAll, false),
  );
  const stack =
    kids.reduce((sum, kid) => sum + kid.subtreeH, 0) +
    SIBLING_GAP * Math.max(0, kids.length - 1);
  return {
    node,
    w: size.w,
    h: size.h,
    kids,
    subtreeH: Math.max(size.h, stack),
    hasKids: childrenOf(nodes, node.id).length > 0,
  };
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
  const rootSize = measureLabel(root.label, true);
  const items: LaidOut[] = [];

  function place(box: Prepared, x: number, top: number, dir: -1 | 1, color: string, ink: string) {
    const y = top + box.subtreeH / 2;
    items.push({
      id: box.node.id,
      label: box.node.label,
      x,
      y,
      w: box.w,
      h: box.h,
      color,
      ink,
      parentId: box.node.parentId,
      hasKids: box.hasKids,
      isRoot: false,
    });
    if (!box.kids.length) return;
    const stack =
      box.kids.reduce((sum, kid) => sum + kid.subtreeH, 0) +
      SIBLING_GAP * Math.max(0, box.kids.length - 1);
    const columnWidth = Math.max(...box.kids.map((kid) => kid.w));
    const childX = x + dir * (box.w / 2 + 40 + columnWidth / 2);
    let cursor = y - stack / 2;
    for (const kid of box.kids) {
      place(kid, childX, cursor, dir, color, ink);
      cursor += kid.subtreeH + SIBLING_GAP;
    }
  }

  items.push({
    id: root.id,
    label: root.label,
    x: 0,
    y: 0,
    w: rootSize.w,
    h: rootSize.h,
    color: "#c4b5e8",
    ink: "#2d2150",
    parentId: null,
    hasKids: childrenOf(nodes, root.id).length > 0,
    isRoot: true,
  });

  function placeSide(list: MindmapNode[], dir: -1 | 1) {
    const prepared = list.map((branch) =>
      prepareNode(nodes, branch, collapsed, expandAll, false),
    );
    const total = prepared.reduce(
      (sum, box, index) => sum + box.subtreeH + (index ? BRANCH_GAP : 0),
      0,
    );
    const columnWidth = prepared.reduce((max, box) => Math.max(max, box.w), 0);
    const x = dir * (rootSize.w / 2 + 48 + columnWidth / 2);
    let cursor = -total / 2;
    prepared.forEach((box) => {
      const palette =
        BRANCH_PASTELS[
          branches.findIndex((item) => item.id === box.node.id) % BRANCH_PASTELS.length
        ]!;
      place(box, x, cursor, dir, palette.fill, palette.ink ?? "#14201b");
      cursor += box.subtreeH + BRANCH_GAP;
    });
  }

  placeSide(left, -1);
  placeSide(right, 1);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    minX = Math.min(minX, item.x - item.w / 2);
    maxX = Math.max(maxX, item.x + item.w / 2);
    minY = Math.min(minY, item.y - item.h / 2);
    maxY = Math.max(maxY, item.y + item.h / 2);
  }
  const pad = 36;
  for (const item of items) {
    item.x += -minX + pad;
    item.y += -minY + pad;
  }
  const width = Math.max(640, maxX - minX + pad * 2);
  const height = Math.max(420, maxY - minY + pad * 2);
  const rootItem = items.find((item) => item.isRoot);
  return {
    width,
    height,
    cx: rootItem?.x ?? width / 2,
    cy: rootItem?.y ?? height / 2,
    items,
  };
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

function anchor(item: LaidOut, towardX: number) {
  const dir = towardX >= item.x ? 1 : -1;
  return { x: item.x + dir * (item.w / 2), y: item.y };
}

export function MindmapTree({
  title,
  nodes,
  deckId,
  editable = false,
}: {
  title: string;
  nodes: MindmapNode[];
  deckId?: string;
  editable?: boolean;
}) {
  const t = useTranslations("studio");
  const nodeKey = nodes.map((node) => `${node.id}:${node.parentId}:${node.label}`).join(",");
  const [mapKey, setMapKey] = useState(nodeKey);
  const [collapsed, setCollapsed] = useState(() => new Set<string>());
  const [expandAll, setExpandAll] = useState(true);
  const [draft, setDraft] = useState(nodes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<number | null>(null);
  const dragId = useRef<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  if (mapKey !== nodeKey) {
    setMapKey(nodeKey);
    setCollapsed(new Set());
    setExpandAll(true);
    setDraft(nodes);
    setSelectedId(null);
    setEditingId(null);
  }

  const working = editable ? draft : nodes;
  const layout = useMemo(
    () => layoutMindmap(working, collapsed, expandAll),
    [working, collapsed, expandAll],
  );
  const byId = useMemo(
    () => new Map(layout.items.map((item) => [item.id, item])),
    [layout.items],
  );

  function persist(next: MindmapNode[]) {
    if (!editable || !deckId) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      startTransition(async () => {
        const { saveMindmapAction } = await import("@/lib/actions/mindmap");
        await saveMindmapAction({ deckId, title, nodes: next });
      });
    }, 500);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.scrollLeft = Math.max(0, layout.cx - canvas.clientWidth / 2);
    canvas.scrollTop = Math.max(0, layout.cy - canvas.clientHeight / 2);
  }, [layout.cx, layout.cy, layout.width, layout.height]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  function apply(next: MindmapNode[]) {
    setDraft(next);
    persist(next);
  }

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
    const done = () => {
      delete document.body.dataset.print;
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.setTimeout(() => window.print(), 50);
  }

  const selected = working.find((node) => node.id === selectedId) ?? null;

  function runAi(mode: "expand" | "rebranch") {
    if (!editable || !deckId || !selectedId) return;
    setError(null);
    startTransition(async () => {
      try {
        const { expandMindmapNodeAction } = await import("@/lib/actions/mindmap");
        const next = await expandMindmapNodeAction({
          deckId,
          nodeId: selectedId,
          mode,
        });
        setDraft(next.nodes);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : t("canvasFailed"));
      }
    });
  }

  return (
    <section className="mindmap-tree">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">{title}</h2>
        <div className="flex flex-wrap items-center gap-2 no-print">
          {editable ? (
            <>
              <button
                className="secondary-button"
                disabled={pending || !selected}
                onClick={() => selected && apply(addChildNode(working, selected.id))}
                type="button"
              >
                {t("addNode")}
              </button>
              <button
                className="secondary-button"
                disabled={pending || !selected || selected.parentId === null}
                onClick={() => selected && apply(deleteNode(working, selected.id))}
                type="button"
              >
                {t("deleteNode")}
              </button>
              <button
                className="secondary-button"
                disabled={pending || !selected}
                onClick={() => runAi("expand")}
                type="button"
              >
                {t("expandNode")}
              </button>
              <button
                className="secondary-button"
                disabled={pending || !selected}
                onClick={() => runAi("rebranch")}
                type="button"
              >
                {t("rebranchNode")}
              </button>
            </>
          ) : null}
          <button
            className="secondary-button"
            onClick={() => {
              if (expandAll) {
                setExpandAll(false);
                setCollapsed(defaultCollapsedBranches(working));
              } else {
                setExpandAll(true);
                setCollapsed(new Set());
              }
            }}
            type="button"
          >
            {expandAll ? t("collapseBranches") : t("expandAll")}
          </button>
          <button className="secondary-button" type="button" onClick={printMap}>
            {t("printMap")}
          </button>
        </div>
      </div>
      <p className="mindmap-hint no-print">
        {editable ? t("canvasHint") : t("expandHint")}
      </p>
      {error ? <p className="mindmap-hint no-print text-rose-700">{error}</p> : null}
      <div className="mindmap-canvas mt-3" ref={canvasRef}>
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
                const from = anchor(parent, item.x);
                const to = anchor(item, parent.x);
                return (
                  <path
                    d={curve(from.x, from.y, to.x, to.y)}
                    fill="none"
                    key={`${parent.id}-${item.id}`}
                    stroke={item.ink}
                    strokeLinecap="round"
                    strokeWidth={item.parentId === layout.items[0]?.id ? 3.5 : 2.25}
                  />
                );
              })}
          </svg>
          {layout.items.map((item) => {
            const style = {
              left: item.x,
              top: item.y,
              width: item.w,
              maxWidth: item.w,
              minHeight: item.h,
              borderColor: "transparent",
              background: item.color,
              color: item.ink,
            } as const;
            if (editingId === item.id) {
              return (
                <input
                  autoFocus
                  className={`mindmap-node mindmap-edit ${item.isRoot ? "is-root" : ""} is-selected`}
                  defaultValue={item.label}
                  key={item.id}
                  maxLength={80}
                  onBlur={(event) => {
                    apply(renameNode(working, item.id, event.target.value));
                    setEditingId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  style={style}
                />
              );
            }
            return (
            <button
              className={`mindmap-node ${item.isRoot ? "is-root" : ""} ${
                selectedId === item.id ? "is-selected" : ""
              }`}
              draggable={editable && !item.isRoot}
              key={item.id}
              onClick={() => {
                if (editable) {
                  setSelectedId(item.id);
                  return;
                }
                if (item.hasKids) toggle(item.id);
              }}
              onDoubleClick={() => {
                if (!editable) return;
                setSelectedId(item.id);
                setEditingId(item.id);
              }}
              onDragOver={(event) => {
                if (!editable) return;
                event.preventDefault();
              }}
              onDragStart={() => {
                dragId.current = item.id;
              }}
              onDrop={(event) => {
                event.preventDefault();
                const from = dragId.current;
                dragId.current = null;
                if (!from || from === item.id) return;
                apply(reparentNode(working, from, item.id));
              }}
              style={style}
              title={item.label}
              type="button"
            >
              {item.label}
            </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
