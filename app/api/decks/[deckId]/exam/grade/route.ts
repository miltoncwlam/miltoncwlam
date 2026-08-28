import { z } from "zod";

import { requireApiSession } from "@/lib/auth-server";
import { getDeckArtifact, insertExamAttempt } from "@/lib/data/artifacts";
import { getDeckWithCards } from "@/lib/data/decks";
import { gradeExamPaper } from "@/lib/llm/grade-exam";
import { parseExamPayload } from "@/lib/llm/parse-studio";
import type { ExamAnswers } from "@/lib/types/notebook";

const bodySchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.string())])),
});

export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ deckId: string }> },
) {
  try {
    const session = await requireApiSession();
    const { deckId } = await context.params;
    const deck = await getDeckWithCards(deckId, session.user.id);
    if (!deck) {
      return Response.json({ error: "Notebook not found" }, { status: 404 });
    }
    const artifact = await getDeckArtifact(deckId, "exam");
    if (!artifact) {
      return Response.json({ error: "No exam paper yet" }, { status: 404 });
    }
    const exam = parseExamPayload(artifact.payload);
    const input = bodySchema.parse(await request.json());
    const answers = input.answers as ExamAnswers;
    const result = await gradeExamPaper({
      questions: exam.questions,
      answers,
    });
    const score = result.reduce((sum, item) => sum + item.marksAwarded, 0);
    const maxScore = result.reduce((sum, item) => sum + item.marks, 0);
    const attempt = await insertExamAttempt({
      deckId,
      userId: session.user.id,
      answers,
      result,
      score,
      maxScore,
    });
    return Response.json({
      attemptId: attempt.id,
      score,
      maxScore,
      result,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid answers"
        : error instanceof Error
          ? error.message
          : "Grading failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
