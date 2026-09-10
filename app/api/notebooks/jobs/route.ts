import { requireApiSession } from "@/lib/auth-server";
import { listUserGenerationJobs } from "@/lib/data/decks";

export async function GET() {
  const session = await requireApiSession();
  const jobs = await listUserGenerationJobs(session.user.id);
  return Response.json({ jobs });
}
