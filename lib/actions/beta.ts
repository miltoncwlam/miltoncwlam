"use server";

import { cookies } from "next/headers";

import { BETA_COOKIE, BETA_COOKIE_MAX_AGE } from "@/lib/beta";

export async function persistBetaPreferenceAction(choice: "enter" | "hide") {
  const jar = await cookies();
  jar.set(BETA_COOKIE, choice, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1",
    path: "/",
    maxAge: BETA_COOKIE_MAX_AGE,
  });
}
