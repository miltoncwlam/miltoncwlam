import { requireApiSession } from "@/lib/auth-server";

/**
 * H3/B3: lightweight SSE heartbeat so the create UI can show truthful wait state.
 * Full token streaming of cards is model-dependent; this emits phase ticks.
 */
export async function GET(request: Request) {
  await requireApiSession();
  const { searchParams } = new URL(request.url);
  const seconds = Math.min(180, Math.max(5, Number(searchParams.get("seconds") || 60)));

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const started = Date.now();
      const phases = ["prepare", "read", "generate", "save"] as const;
      let tick = 0;

      const id = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        const phase = phases[Math.min(phases.length - 1, Math.floor(elapsed / (seconds / phases.length)))];
        const payload = JSON.stringify({
          phase,
          elapsed,
          tip:
            phase === "generate"
              ? "Model is writing cards…"
              : phase === "read"
                ? "Reading your source…"
                : "Working…",
        });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        tick += 1;
        if (elapsed >= seconds || tick > 200) {
          clearInterval(id);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: "done", elapsed })}\n\n`));
          controller.close();
        }
      }, 1000);

      request.signal.addEventListener("abort", () => {
        clearInterval(id);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
