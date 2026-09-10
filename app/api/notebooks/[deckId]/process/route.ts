import { requireApiSession } from "@/lib/auth-server";
import { ingestJobTokenOk } from "@/lib/ingest/job-token";
import { processNotebookTick } from "@/lib/ingest/notebook-job";
import { getDeckById, getDeckWithCards } from "@/lib/data/decks";

export const maxDuration = 180;

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

  const result = await processNotebookTick(deckId);
  return Response.json(result);
}
