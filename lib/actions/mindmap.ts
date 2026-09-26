"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import { isV44FeaturesLive } from "@/lib/campaign";
import { estimateArtifactCredits } from "@/lib/credits/estimate-generation";
import { creditsFromTokens } from "@/lib/credits/token-cost";
import { getDeckArtifact, upsertDeckArtifact } from "@/lib/data/artifacts";
import {
  assertAndSpendCredits,
  assertGenerateRateLimit,
  assertGuestGenerateQuota,
  getOrRefreshCredits,
  refundCredits,
} from "@/lib/data/credits";
import { getDeckWithCards } from "@/lib/data/decks";
import { parseIngestProgress } from "@/lib/ingest/progress";
import { generateMindmapChildren } from "@/lib/llm/generate-mindmap";
import { loadNotebookSource } from "@/lib/llm/load-notebook-source";
import { DEFAULT_OPENROUTER_MODEL, resolveBillingRates } from "@/lib/llm/models";
import { attachChildLabels, serializeMindmap } from "@/lib/mindmap/edit";
import type { MindmapNode, MindmapPayload } from "@/lib/types/notebook";

const idSchema = z.string().uuid();
const nodeSchema = z.object({
  id: z.string().min(1).max(40),
  parentId: z.string().max(40).nullable(),
  label: z.string().trim().min(1).max(80),
});

export async function saveMindmapAction(input: {
  deckId: string;
  title: string;
  nodes: MindmapNode[];
}) {
  if (!isV44FeaturesLive()) throw new Error("Mind map editing is not available yet");
  const session = await requireSession();
  const deckId = idSchema.parse(input.deckId);
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) throw new Error("Notebook not found");
  const title = z.string().trim().min(1).max(100).parse(input.title);
  const nodes = z.array(nodeSchema).min(1).max(60).parse(input.nodes);
  await upsertDeckArtifact({
    deckId,
    kind: "mindmap",
    payload: serializeMindmap(title, nodes),
    model: deck.generationModel,
  });
  revalidatePath(`/decks/${deckId}`);
}

export async function expandMindmapNodeAction(input: {
  deckId: string;
  nodeId: string;
  mode: "expand" | "rebranch";
}): Promise<MindmapPayload> {
  if (!isV44FeaturesLive()) throw new Error("Mind map editing is not available yet");
  const session = await requireSession();
  const deckId = idSchema.parse(input.deckId);
  const nodeId = z.string().min(1).max(40).parse(input.nodeId);
  const mode = z.enum(["expand", "rebranch"]).parse(input.mode);
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) throw new Error("Notebook not found");
  const artifact = await getDeckArtifact(deckId, "mindmap");
  const payload = artifact?.payload as MindmapPayload | undefined;
  if (!payload?.nodes?.length) throw new Error("Generate a mind map first");
  const node = payload.nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error("Node not found");

  const model = deck.generationModel || undefined;
  const provider = deck.generationProvider ?? "openrouter";
  const credits = await getOrRefreshCredits(session.user.id);
  await assertGuestGenerateQuota(session.user.id, session.user.isGuest);
  await assertGenerateRateLimit(session.user.id, {
    provider,
    model: model ?? "",
    isUnlimited: credits.isUnlimited || provider === "ollama",
  });

  const source = await loadNotebookSource(deck);
  const estimate = estimateArtifactCredits({
    provider,
    modelId: model || DEFAULT_OPENROUTER_MODEL,
    sourceMode: source.sourceMode,
    sourceSize: { charCount: Math.min(1_200, source.charCount) },
    kind: "mindmap",
    depth: "basic",
  });
  const spent = await assertAndSpendCredits({
    userId: session.user.id,
    textAmount: estimate.textCredits,
    imageAmount: 0,
    reason: "generate_mindmap",
    skipBalance: session.user.isGuest || provider === "ollama",
    meta: { deckId, kind: "mindmap", mode },
  });
  const spentTextAmount = spent.isUnlimited ? 0 : estimate.textCredits;

  try {
    const parent = payload.nodes.find((item) => item.id === node.parentId);
    const siblings = payload.nodes
      .filter((item) => item.parentId === node.id)
      .map((item) => item.label);
    const generated = await generateMindmapChildren({
      source: source.text,
      nodeLabel: node.label,
      parentLabel: parent?.label ?? null,
      siblingLabels: siblings,
      mode,
      language: parseIngestProgress(deck.ingestProgress)?.language,
      model,
      provider,
    });
    const next = serializeMindmap(
      payload.title,
      attachChildLabels(payload.nodes, nodeId, generated.labels, mode),
    );
    await upsertDeckArtifact({
      deckId,
      kind: "mindmap",
      payload: next,
      model,
    });

    const rates = resolveBillingRates({
      provider: provider === "ollama" ? "ollama" : "openrouter",
      modelId: model || DEFAULT_OPENROUTER_MODEL,
    });
    const actual = creditsFromTokens(
      generated.usage.inputTokens || generated.usage.outputTokens
        ? generated.usage
        : {
            inputTokens: estimate.inputTokens,
            outputTokens: estimate.outputTokens,
          },
      rates,
    );
    if (!spent.isUnlimited && spentTextAmount > actual) {
      await refundCredits({
        userId: session.user.id,
        textAmount: spentTextAmount - actual,
        imageAmount: 0,
        reason: "generate_reconcile",
        meta: { deckId, kind: "mindmap", mode },
      });
    }
    revalidatePath(`/decks/${deckId}`);
    return next;
  } catch (error) {
    if (spentTextAmount > 0) {
      await refundCredits({
        userId: session.user.id,
        textAmount: spentTextAmount,
        imageAmount: 0,
        reason: "generate_refund",
        meta: { deckId, kind: "mindmap", mode },
      }).catch(() => {});
    }
    throw error;
  }
}
