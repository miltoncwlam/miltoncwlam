import { describe, expect, it } from "vitest";

import {
  addChildNode,
  attachChildLabels,
  canReparent,
  deleteNode,
  descendantsOf,
  nextNodeId,
  renameNode,
  reparentNode,
} from "@/lib/mindmap/edit";
import type { MindmapNode } from "@/lib/types/notebook";

const sample: MindmapNode[] = [
  { id: "n1", parentId: null, label: "Topic" },
  { id: "n2", parentId: "n1", label: "Light" },
  { id: "n3", parentId: "n1", label: "Dark" },
  { id: "n4", parentId: "n2", label: "Chlorophyll" },
];

describe("mind map edits", () => {
  it("allocates the next n-id", () => {
    expect(nextNodeId(sample)).toBe("n5");
  });

  it("blocks reparenting onto a descendant", () => {
    expect(canReparent(sample, "n2", "n4")).toBe(false);
    expect(canReparent(sample, "n4", "n3")).toBe(true);
    expect(canReparent(sample, "n1", "n2")).toBe(false);
  });

  it("reparents a leaf", () => {
    const next = reparentNode(sample, "n4", "n3");
    expect(next.find((node) => node.id === "n4")?.parentId).toBe("n3");
  });

  it("renames and adds a child", () => {
    const renamed = renameNode(sample, "n3", "Calvin cycle");
    expect(renamed.find((node) => node.id === "n3")?.label).toBe("Calvin cycle");
    const added = addChildNode(sample, "n3", "Stroma");
    expect(added).toHaveLength(5);
    expect(added.at(-1)).toMatchObject({ parentId: "n3", label: "Stroma" });
  });

  it("promotes children when a branch is deleted", () => {
    const next = deleteNode(sample, "n2");
    expect(next.map((node) => node.id)).toEqual(["n1", "n3", "n4"]);
    expect(next.find((node) => node.id === "n4")?.parentId).toBe("n1");
  });

  it("expands without duplicating labels and rebranches by replacing descendants", () => {
    const tree = sample.map((node) => ({ ...node }));
    const expanded = attachChildLabels(tree, "n2", ["Chlorophyll", "ATP"], "expand");
    expect(expanded.filter((node) => node.parentId === "n2").map((node) => node.label)).toEqual([
      "Chlorophyll",
      "ATP",
    ]);
    const rebranched = attachChildLabels(tree, "n2", ["Pigments", "Energy"], "rebranch");
    expect(rebranched.map((node) => node.label)).not.toContain("Chlorophyll");
    expect(rebranched.filter((node) => node.parentId === "n2").map((node) => node.label)).toEqual([
      "Pigments",
      "Energy",
    ]);
    expect(descendantsOf(rebranched, "n2").size).toBe(2);
  });
});
