import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const bucket = () => env.SUPABASE_STORAGE_BUCKET;

export async function ensureStorageBucket(): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.storage.getBucket(bucket());
  if (data) return;

  const { error } = await admin.storage.createBucket(bucket(), {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: [
      "text/plain",
      "text/markdown",
      "application/pdf",
      "image/jpeg",
      "image/png",
    ],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(error.message);
  }
}

export async function createSourceUploadUrl(
  path: string,
): Promise<{ token: string; path: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket())
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create upload URL");
  }

  return { token: data.token, path: data.path };
}

export async function downloadSourceMedia(path: string): Promise<Uint8Array> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket()).download(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to download source media");
  }

  return new Uint8Array(await data.arrayBuffer());
}

export async function deleteSourceMedia(path: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket()).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}
