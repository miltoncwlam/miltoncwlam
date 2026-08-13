"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth-server";
import { setUserEnergySettings } from "@/lib/data/credits";
import { pool } from "@/lib/db";

const energySchema = z.object({
  userId: z.string().min(1),
  periodGrant: z.coerce.number().int().min(0).max(10_000),
  imagePeriodGrant: z.coerce.number().int().min(0).max(10_000),
  isUnlimited: z.coerce.boolean(),
  balance: z.coerce.number().int().min(0).max(100_000).optional(),
  imageBalance: z.coerce.number().int().min(0).max(100_000).optional(),
});

export async function adminUpdateEnergyAction(formData: FormData) {
  await requireAdminSession();
  const input = energySchema.parse({
    userId: formData.get("userId"),
    periodGrant: formData.get("periodGrant"),
    imagePeriodGrant: formData.get("imagePeriodGrant"),
    isUnlimited: formData.get("isUnlimited") === "on",
    balance: formData.get("balance") || undefined,
    imageBalance: formData.get("imageBalance") || undefined,
  });

  await setUserEnergySettings(input);
  revalidatePath("/admin");
  revalidatePath("/admin/energy");
}

export async function adminSetFeaturedAction(formData: FormData) {
  await requireAdminSession();
  const deckId = z.string().uuid().parse(formData.get("deckId"));
  const featured = formData.get("featured") === "on" || formData.get("featured") === "true";
  await pool.query(`update decks set is_featured = $2 where id = $1`, [
    deckId,
    featured,
  ]);
  revalidatePath("/admin");
  revalidatePath("/community");
}

export async function adminAttachCommunityImagesAction(formData: FormData) {
  const session = await requireAdminSession();
  const deckId = z.string().uuid().parse(formData.get("deckId"));
  const replace = formData.get("replace") === "on";
  const { resolveLicensedImage } = await import(
    "@/lib/images/resolve-licensed-image"
  );
  const { writeAuditLog } = await import("@/lib/data/audit");

  const cards = await pool.query<{
    id: string;
    front: string;
    sort_order: number;
    image_url: string | null;
  }>(
    `select id, front, sort_order, image_url from cards
     where deck_id = $1 order by sort_order`,
    [deckId],
  );

  let attached = 0;
  for (const card of cards.rows) {
    if (card.image_url && !replace) continue;
    const found = await resolveLicensedImage({
      query: card.front.slice(0, 80),
      allowAi: true,
      storagePath: `system:study-a-community/art/admin/${deckId}/${card.sort_order}`,
    });
    if (!found) continue;
    await pool.query(
      `update cards set image_url = $2, image_attribution = $3::jsonb where id = $1`,
      [card.id, found.imageUrl, JSON.stringify(found.attribution)],
    );
    attached += 1;
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "illustrate_community",
    entityType: "deck",
    entityId: deckId,
    meta: { attached, replace },
  });
  revalidatePath("/admin");
  revalidatePath(`/community/${deckId}`);
  revalidatePath("/community");
}

export async function adminResolveReportAction(formData: FormData) {
  await requireAdminSession();
  const session = await requireAdminSession();
  const reportId = z.string().uuid().parse(formData.get("reportId"));
  const status = z.enum(["resolved", "dismissed"]).parse(formData.get("status"));
  await pool.query(
    `update moderation_reports
     set status = $2, resolved_at = now(), resolved_by = $3
     where id = $1`,
    [reportId, status, session.user.id],
  );
  revalidatePath("/admin");
}
