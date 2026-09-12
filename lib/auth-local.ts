export const LOCAL_DEV_USER_ID = "local_dev";
export const LOCAL_AUTH_COOKIE = "hk_local_auth";

export const LOCAL_DEV_USER = {
  id: LOCAL_DEV_USER_ID,
  email: "local@localhost",
  name: "Local",
  role: "user" as const,
  isGuest: false,
};

export function isLocalAppHost(host: string | null | undefined) {
  if (process.env.VERCEL === "1") return false;
  const hostname = (host ?? "").split(":")[0]?.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Localhost cookie user never spends the weekly energy pool. Never on Vercel. */
export function isLocalDevUnlimitedUser(userId: string) {
  return process.env.VERCEL !== "1" && userId === LOCAL_DEV_USER_ID;
}

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return bytesToHex(signature);
}

function sameHex(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mix = 0;
  for (let i = 0; i < left.length; i += 1) {
    mix |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mix === 0;
}

export async function createLocalAuthCookie(secret: string, now = Date.now()) {
  const exp = Math.floor(now / 1000) + 60 * 60 * 24 * 30;
  const payload = `v1.${exp}.${LOCAL_DEV_USER_ID}`;
  const signature = await hmacHex(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyLocalAuthCookie(
  value: string | undefined,
  secret: string,
  now = Date.now(),
) {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const [, exp, userId, signature] = parts;
  if (userId !== LOCAL_DEV_USER_ID) return false;
  const expires = Number(exp);
  if (!Number.isFinite(expires) || expires * 1000 < now) return false;
  const expected = await hmacHex(`v1.${exp}.${userId}`, secret);
  return sameHex(signature ?? "", expected);
}
