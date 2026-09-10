import { describe, expect, it } from "vitest";

import { ingestPhaseLabel, parseIngestProgress } from "@/lib/ingest/progress";

describe("ingest progress", () => {
  it("reads OCR page counters for the walk-away banner", () => {
    const progress = parseIngestProgress({
      language: "zh-Hant",
      needsOcr: true,
      ocrNext: 2,
      ocrTotal: 10,
    });
    expect(progress?.ocrNext).toBe(2);
    expect(ingestPhaseLabel(progress)).toBe("ocr:2/10");
  });

  it("keeps a cards studio job on ingest_progress", () => {
    const progress = parseIngestProgress({
      language: "en",
      cardsStatus: "processing",
      cardsError: "",
    });
    expect(progress?.cardsStatus).toBe("processing");
    expect(
      parseIngestProgress({ language: "en", cardsStatus: "complete" })?.cardsStatus,
    ).toBeUndefined();
  });
});
