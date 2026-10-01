import { requireApiSession } from "@/lib/auth-server";
import { ingestJobTokenOk } from "@/lib/ingest/job-token";
import {
  enqueueNotebookProcess,
  processNotebookTick,
} from "@/lib/ingest/notebook-job";
import { getDeckById, getDeckWithCards } from "@/lib/data/decks";

export const maxDuration = 180;

/** Leave headroom for one OCR page (~70–125s) inside the 180s function budget. */
const TICK_DEADLINE_MS = 55_000;

export async function POST(
  request: Request,
  context: { params: Promise<{ deckId: string }> },
) {
  const { deckId } = await context.params;
  const jobToken = request.headers.get("x-ingest-job");
  let allowed = ingestJobTokenOk(deckId, jobToken);
  if (!allowed) {
    const session = await requireApiSession();
    const owned = await getDeckWithCards(deckId, session.user.id);
    allowed = Boolean(owned);
  }
  if (!allowed) {
    return Response.json({ error: "Notebook not found" }, { status: 404 });
  }
  const deck = await getDeckById(deckId);
  if (!deck) {
    return Response.json({ error: "Notebook not found" }, { status: 404 });
  }

  const started = Date.now();
  let result = await processNotebookTick(deckId);
  // Chain more pages in this request while budget remains. Relying only on
  // after()+fetch between pages left notebooks stuck on "Reading page N".
  while (
    result.continue &&
    !result.done &&
    Date.now() - started < TICK_DEADLINE_MS
  ) {
    result = await processNotebookTick(deckId);
  }
  if (result.continue && !result.done) {
    enqueueNotebookProcess(deckId);
  }
  return Response.json(result);
}
