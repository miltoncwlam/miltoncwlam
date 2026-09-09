"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth-server";
import { writeAuditLog } from "@/lib/data/audit";
import { redeemEnergyGiftCode } from "@/lib/data/credits";

export async function redeemGiftCodeAction(formData: FormData): Promise<
  | { ok: true; already: boolean }
  | { error: string }
> {
  const session = await requireSession();
  const code = String(formData.get("code") ?? "");
  try {
    const result = await redeemEnergyGiftCode(session.user.id, code);
    await writeAuditLog({
      userId: session.user.id,
      action: "gift_code",
      entityType: "user",
      entityId: session.user.id,
      meta: { alreadyUnlimited: result.alreadyUnlimited },
    });
    revalidatePath("/");
    revalidatePath("/account");
    revalidatePath("/decks/new");
    return { ok: true, already: result.alreadyUnlimited };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That gift code is not valid.";
    return { error: message };
  }
}
