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
});
