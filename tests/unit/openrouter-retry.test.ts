import { describe, expect, it, vi } from "vitest";

import {
  OpenRouterTimeoutError,
  withOpenRouterRetry,
} from "@/lib/llm/openrouter-retry";

describe("withOpenRouterRetry", () => {
  it("retries one transient timeout and returns the next result", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("timed out", "AbortError"))
      .mockResolvedValueOnce("deck");

    await expect(
      withOpenRouterRetry(request, Date.now() + 30_000),
    ).resolves.toBe("deck");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-transient provider error", async () => {
    const request = vi.fn().mockRejectedValue(new Error("invalid response schema"));

    await expect(
      withOpenRouterRetry(request, Date.now() + 30_000),
    ).rejects.toThrow("invalid response schema");
    expect(request).toHaveBeenCalledOnce();
  });

  it("does not start a request after the cleanup reserve", async () => {
    const request = vi.fn();

    await expect(
      withOpenRouterRetry(request, Date.now() + 1_000),
    ).rejects.toBeInstanceOf(OpenRouterTimeoutError);
    expect(request).not.toHaveBeenCalled();
  });
});
