import { NextRequest, NextResponse } from "next/server";

import { BETA_COOKIE, BETA_COOKIE_MAX_AGE } from "@/lib/beta";

export async function GET(request: NextRequest) {
  const next = NextResponse.redirect(new URL("/", request.url));
  next.cookies.set(BETA_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1",
    path: "/",
    maxAge: BETA_COOKIE_MAX_AGE,
  });
  return next;
}
