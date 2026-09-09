export function friendlyGenerateError(message: string, code?: string) {
  if (code === "GUEST_QUOTA") {
    return "Guest trial is used up. Create a free account to keep generating.";
  }
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
  if (
    /OCR found no readable text|no selectable text|likely a scan|OCR it first|could not read this scanned PDF|could not convert any PDF pages/i.test(
      message,
    )
  ) {
    return "This PDF looks like a photo of a page. We try OCR automatically — if that fails, paste the text.";
  }
  if (/path["'] argument must be of type string/i.test(message)) {
    return "This PDF looks like a photo of a page. We try OCR automatically — if that fails, paste the text.";
  }
  if (/guest trial is used up/i.test(message)) {
    return "Guest trial is used up. Create a free account to keep generating.";
  }
  if (/reading this scan took too long/i.test(message)) {
    return "Reading this scan took too long. Try fewer pages, or paste the text.";
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
  if (/expected number|invalid option|invalid input|invalid_type|too_small|did not match schema|JSONParse|Invalid JSON response|invalid json|NoObjectGenerated/i.test(message)) {
    return "The model returned a messy draft. Retry — it usually works the second time.";
  }
  return message;
}
