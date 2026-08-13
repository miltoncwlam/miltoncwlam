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
      "image/png",
      "image/jpeg",
      "image/webp",
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

/** Best-effort: source file plus any card images under this deck folder. */
export async function deleteDeckMedia(input: {
  userId: string;
  deckId: string;
  storagePath?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const prefix = `${input.userId}/decks/${input.deckId}`;
  const { data } = await admin.storage.from(bucket()).list(prefix);
  const paths = [
    ...(input.storagePath ? [input.storagePath] : []),
    ...(data ?? []).map((file) => `${prefix}/${file.name}`),
  ];
  if (!paths.length) return;
  await admin.storage.from(bucket()).remove(paths);
}

export async function cleanupDiscardedGenerations(
  rows: Array<{ id: string; userId: string; storagePath: string | null }>,
): Promise<void> {
  await Promise.all(
    rows.map((row) =>
      deleteDeckMedia({
        userId: row.userId,
        deckId: row.id,
        storagePath: row.storagePath,
      }).catch(() => undefined),
    ),
  );
}

export async function uploadCardImage(input: {
  path: string;
  bytes: Uint8Array;
  contentType: string;
}): Promise<string> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket()).upload(input.path, input.bytes, {
    contentType: input.contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);

  const { data, error: signError } = await admin.storage
    .from(bucket())
    .createSignedUrl(input.path, 60 * 60 * 24 * 365);
  if (signError || !data?.signedUrl) {
    throw new Error(signError?.message ?? "Failed to sign card image URL");
  }
  return data.signedUrl;
}

