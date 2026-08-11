import { z } from "zod";

const uploadSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum([
    "text/plain",
    "text/markdown",
    "application/pdf",
    "image/jpeg",
    "image/png",
  ]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});

const extensionsByMime: Record<string, string[]> = {
  "text/plain": ["txt"],
  "text/markdown": ["md", "markdown"],
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
};

export type ValidatedUpload = z.infer<typeof uploadSchema> & {
  extension: string;
  sourceType: "file" | "photo";
};

function looksLikeText(data: Uint8Array) {
  const sample = data.slice(0, Math.min(data.length, 512));
  if (!sample.length) return false;
  let weird = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte < 7 || (byte > 14 && byte < 32)) weird += 1;
  }
  return weird / sample.length < 0.3;
}

export function validateUpload(input: {
  name: string;
  type: string;
  size: number;
}): ValidatedUpload {
  // Normalize common browser MIME aliases
  const type =
    input.type === "text/x-markdown" || input.type === "application/markdown"
      ? "text/markdown"
      : input.type === "image/jpg"
        ? "image/jpeg"
        : input.type;

  const parsed = uploadSchema.parse({ ...input, type });
  const extension = parsed.name.split(".").pop()?.toLowerCase() ?? "";

  if (!extension) {
    throw new Error("Filename must include an extension");
  }
  if (!extensionsByMime[parsed.type]?.includes(extension)) {
    throw new Error("The filename extension does not match the file type");
  }

  if (parsed.type.startsWith("text/") && parsed.size > 2 * 1024 * 1024) {
    throw new Error("Text and Markdown files must be 2 MB or smaller");
  }

  if (parsed.size < 8) {
    throw new Error("File is too small to be a valid upload");
  }

  return {
    ...parsed,
    extension,
    sourceType: parsed.type.startsWith("image/") ? "photo" : "file",
  };
}

export function assertOwnedStoragePath(path: string, userId: string) {
  if (
    !path.startsWith(`${userId}/`) ||
    path.includes("..") ||
    path.includes("//") ||
    path.includes("\\")
  ) {
    throw new Error("Invalid storage path");
  }
}

export function validateFileSignature(data: Uint8Array, mimeType: string) {
  if (!data.length) {
    throw new Error("Uploaded file is empty");
  }

  const startsWith = (...bytes: number[]) =>
    bytes.every((byte, index) => data[index] === byte);

  if (mimeType === "application/pdf") {
    if (!startsWith(0x25, 0x50, 0x44, 0x46)) {
      throw new Error("The uploaded file is not a valid PDF");
    }
    return;
  }
  if (mimeType === "image/png") {
    if (!startsWith(0x89, 0x50, 0x4e, 0x47)) {
      throw new Error("The uploaded file is not a valid PNG image");
    }
    return;
  }
  if (mimeType === "image/jpeg") {
    if (!startsWith(0xff, 0xd8, 0xff)) {
      throw new Error("The uploaded file is not a valid JPEG image");
    }
    return;
  }
  if (mimeType.startsWith("text/") && !looksLikeText(data)) {
    throw new Error("The uploaded file does not look like plain text");
  }
}
