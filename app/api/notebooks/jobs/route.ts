import { requireApiSession } from "@/lib/auth-server";
import { listUserGenerationJobs } from "@/lib/data/decks";
import { enqueueNotebookProcess } from "@/lib/ingest/notebook-job";

export async function GET() {
  const session = await requireApiSession();
  const jobs = await listUserGenerationJobs(session.user.id);
  const now = Date.now();
  for (const job of jobs) {
    if (
      job.kind !== "ingest" ||
      (job.status !== "processing" && job.status !== "pending")
    ) {
      continue;
    }
    if (!job.ocrTotal || (job.ocrNext ?? 1) > job.ocrTotal) continue;
    const updated = job.updatedAt ? Date.parse(job.updatedAt) : 0;
    const staleMs = now - (Number.isFinite(updated) ? updated : 0);
    // Kick only when idle, or when a busy claim is older than the reclaim window.
    if (job.ocrBusy && staleMs < 3 * 60_000) continue;
    if (!job.ocrBusy && staleMs < 8_000) continue;
    enqueueNotebookProcess(job.deckId);
  }
  return Response.json({ jobs });
}
