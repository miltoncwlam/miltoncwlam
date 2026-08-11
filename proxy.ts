import { clerkMiddleware } from "@clerk/nextjs/server";
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/decks",
  "/community",
  "/admin",
  "/account",
  "/class",
  "/api/decks",
  "/api/uploads",
];

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY,
);

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function unauthorizedResponse(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", pathname);
  return NextResponse.redirect(signIn);
}

async function proxyCore(
  request: NextRequest,
  clerkUserId: string | null | undefined,
) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (getSessionCookie(request)) {
    return NextResponse.next();
  }

  if (clerkUserId) {
    return NextResponse.next();
  }

  return unauthorizedResponse(request);
}

const handler = clerkEnabled
  ? clerkMiddleware(async (auth, request) => {
      const { userId } = await auth();
      return proxyCore(request, userId);
    })
  : async (request: NextRequest) => proxyCore(request, null);

export default handler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
