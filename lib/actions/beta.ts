"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-server";
import { BETA_COOKIE, BETA_COOKIE_MAX_AGE } from "@/lib/beta";

export async function enterV4BetaAction() {
  const jar = await cookies();
  jar.set(BETA_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1",
    path: "/",
    maxAge: BETA_COOKIE_MAX_AGE,
  });
  const session = await getSession();
  redirect(session ? "/decks" : "/");
}
