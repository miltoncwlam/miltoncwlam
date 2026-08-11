import { z } from "zod";

import { requireApiSession } from "@/lib/auth-server";
import { env } from "@/lib/env";
import { validateUpload } from "@/lib/ingest/validate-upload";
import {
  createSourceUploadUrl,
  ensureStorageBucket,
} from "@/lib/supabase/storage";

const requestSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
});

export async function POST(request: Request) {
  try {
    if (!env.supabaseSecretKey) {
      return Response.json(
        {
          error:
            "Add SUPABASE_SECRET_KEY to .env.local to enable file and photo uploads",
        },
        { status: 503 },
      );
    }

    const session = await requireApiSession();
    const upload = validateUpload(requestSchema.parse(await request.json()));
    const path = `${session.user.id}/${crypto.randomUUID()}.${upload.extension}`;

    await ensureStorageBucket();
    const signed = await createSourceUploadUrl(path);

    return Response.json({
      ...signed,
      bucket: env.SUPABASE_STORAGE_BUCKET,
      metadata: upload,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Invalid upload";
    const secretKeyHint =
      /SUPABASE_SECRET_KEY|secret key/i.test(message)
        ? "Add SUPABASE_SECRET_KEY to .env.local to enable uploads"
        : message;
    return Response.json({ error: secretKeyHint }, { status: 400 });
  }
}
