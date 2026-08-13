import { generateCardImage } from "@/lib/llm/generate-card-images";
import { isPublicDomainOrCc0, type ImageAttribution } from "@/lib/images/license";
import {
  findLicensedWebImage,
  type FoundLicensedImage,
} from "@/lib/images/search-licensed-image";
import { uploadCardImage } from "@/lib/supabase/storage";

export type ResolvedLicensedImage = FoundLicensedImage;

type ResolveInput = {
  query: string;
  allowAi?: boolean;
  storagePath: string;
};

function extFor(contentType: string) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  return "jpg";
}

async function generateAi(query: string): Promise<FoundLicensedImage | null> {
  try {
    const image = await generateCardImage({ prompt: query });
    return {
      bytes: image.bytes,
      contentType: image.mediaType,
      attribution: {
        source: "ai",
        license: "AI-generated",
        title: query.slice(0, 80),
      },
    };
  } catch {
    return null;
  }
}

export async function resolveLicensedImage(
  input: ResolveInput,
): Promise<{ imageUrl: string; attribution: ImageAttribution } | null> {
  const query = input.query.trim().slice(0, 120);
  if (!query) return null;

  const found =
    (await findLicensedWebImage(query)) ??
    (input.allowAi ? await generateAi(query) : null);

  if (!found) return null;

  const ext = extFor(found.contentType);
  const path = input.storagePath.replace(/\.(png|jpe?g|webp)$/i, "") + `.${ext}`;
  const imageUrl = await uploadCardImage({
    path,
    bytes: found.bytes,
    contentType: found.contentType,
  });
  return { imageUrl, attribution: found.attribution };
}

export function pdPreferred(attr: ImageAttribution) {
  return attr.source !== "ai" && isPublicDomainOrCc0(attr.license);
}
