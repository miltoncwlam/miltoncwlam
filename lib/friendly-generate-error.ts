export function friendlyGenerateError(message: string, code?: string) {
  if (code === "UNRELATED_SOURCE") {
    return (
      message ||
      "This source doesn’t look like study material. Paste notes, a lesson, or an article — not random chat or memes."
    );
  }
  if (code === "INSUFFICIENT_CONTENT") {
    return (
      message ||
      "Not enough usable study content. Add more notes or try a longer source."
    );
  }
  if (code === "RATE_LIMITED") {
    return message || "Too many generates this hour. Wait a bit, then try again.";
  }
  if (/too large to read|too large \(max/i.test(message)) {
    return "That page is too heavy to fetch whole. Paste the article text, or try a shorter URL.";
  }
  if (/aborted|timeout/i.test(message)) {
    return "The model took too long. Try again, or use a shorter source.";
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "The connection dropped. Try again with a shorter source.";
  }
  if (/expected number|invalid option|invalid input|invalid_type|too_small|did not match schema|JSONParse|NoObjectGenerated/i.test(message)) {
    return "The model returned a messy draft. Retry — it usually works the second time.";
  }
  return message;
}
