import "server-only";

import { getLLMConfig, openRouterHeaders } from "@/lib/llm/config";
import { DEFAULT_IMAGE_MODEL } from "@/lib/llm/models";

const KID_SAFE_SUFFIX =
  "Educational illustration for students, simple, colorful, no text, no letters, no watermarks, safe for children.";

export type GeneratedCardImage = {
  bytes: Uint8Array;
  mediaType: "image/png" | "image/webp" | "image/jpeg";
  usdCost: number;
};

type ImagesResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  images?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  usage?: { cost?: number };
};

function parseBytes(payload: ImagesResponse): {
  bytes: Uint8Array;
  mediaType: GeneratedCardImage["mediaType"];
} | null {
  const item = payload.data?.[0] ?? payload.images?.[0];
  if (item?.b64_json) {
    return {
      bytes: Uint8Array.from(Buffer.from(item.b64_json, "base64")),
      mediaType: "image/png",
    };
  }
  return null;
}

export async function generateCardImage(input: {
  prompt: string;
  model?: string;
}): Promise<GeneratedCardImage> {
  const apiKey = getLLMConfig().openrouter.apiKey;
  if (!apiKey) {
    throw new Error("OpenRouter is required to generate card illustrations.");
  }

  const prompt = `${input.prompt.trim().slice(0, 400)}. ${KID_SAFE_SUFFIX}`;
  const model = input.model?.trim() || DEFAULT_IMAGE_MODEL;

  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...openRouterHeaders(),
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Image generation failed (${response.status}): ${body.slice(0, 180)}`,
    );
  }

  const payload = (await response.json()) as ImagesResponse;
  let parsed = parseBytes(payload);
  const remoteUrl = payload.data?.[0]?.url ?? payload.images?.[0]?.url;
  if (!parsed && remoteUrl) {
    const imageResponse = await fetch(remoteUrl);
    if (!imageResponse.ok) {
      throw new Error("Could not download generated illustration");
    }
    const buffer = new Uint8Array(await imageResponse.arrayBuffer());
    const contentType = imageResponse.headers.get("content-type") ?? "";
    parsed = {
      bytes: buffer,
      mediaType: contentType.includes("webp")
        ? "image/webp"
        : contentType.includes("jpeg")
          ? "image/jpeg"
          : "image/png",
    };
  }

  if (!parsed) {
    throw new Error("Image API returned no image data");
  }

  return {
    ...parsed,
    usdCost: Number(payload.usage?.cost ?? 0) || 0,
  };
}
