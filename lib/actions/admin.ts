"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { requireAdminSession } from "@/lib/auth-server";
import { setUserEnergySettings } from "@/lib/data/credits";
import { pool } from "@/lib/db";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(80).default("Learner"),
  password: z.string().min(8).max(128),
  periodGrant: z.coerce.number().int().min(0).max(10_000).default(100),
  isUnlimited: z.coerce.boolean().default(false),
});

const energySchema = z.object({
  userId: z.string().min(1),
  periodGrant: z.coerce.number().int().min(0).max(10_000),
  isUnlimited: z.coerce.boolean(),
  balance: z.coerce.number().int().min(0).max(100_000).optional(),
});

export async function adminCreateUserAction(formData: FormData) {
  await requireAdminSession();
  const input = createUserSchema.parse({
    email: formData.get("email"),
    name: formData.get("name") || "Learner",
    password: formData.get("password"),
    periodGrant: formData.get("periodGrant") || 100,
    isUnlimited: formData.get("isUnlimited") === "on",
  });

  const created = await auth.api.createUser({
    body: {
      email: input.email,
      password: input.password,
      name: input.name,
      role: "user",
    },
    headers: await headers(),
  });

  const userId = created.user.id;
  await setUserEnergySettings({
    userId,
    periodGrant: input.periodGrant,
    isUnlimited: input.isUnlimited,
    balance: input.isUnlimited ? input.periodGrant : input.periodGrant,
  });

  revalidatePath("/admin");
  void userId;
}

export async function adminUpdateEnergyAction(formData: FormData) {
  await requireAdminSession();
  const input = energySchema.parse({
    userId: formData.get("userId"),
    periodGrant: formData.get("periodGrant"),
    isUnlimited: formData.get("isUnlimited") === "on",
    balance: formData.get("balance") || undefined,
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
