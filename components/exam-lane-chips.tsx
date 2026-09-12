import {
  EXAM_SYSTEMS,
  EXAM_SYSTEM_LABELS,
  type ExamSystem,
} from "@/lib/llm/exam-profiles";
import { updateExamSystemAction } from "@/lib/actions/decks";

export function ExamLaneChips({
  deckId,
  examSystem,
}: {
  deckId: string;
  examSystem: ExamSystem;
}) {
  return (
    <form action={updateExamSystemAction} className="exam-lane-chips">
      <input name="deckId" type="hidden" value={deckId} />
      {EXAM_SYSTEMS.map((system) => (
        <button
          aria-pressed={examSystem === system}
          className="exam-lane-chip"
          key={system}
          name="examSystem"
          type="submit"
          value={system}
        >
          {EXAM_SYSTEM_LABELS[system]}
        </button>
      ))}
    </form>
  );
}
