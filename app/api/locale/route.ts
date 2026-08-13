import { NextResponse } from "next/server";

import {
  LOCALE_COOKIE,
  parseAppLocale,
} from "@/lib/i18n/locales";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    locale?: string;
  } | null;
  const locale = parseAppLocale(body?.locale);

  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
