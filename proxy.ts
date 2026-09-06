import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/decks(.*)",
  "/community(.*)",
  "/admin(.*)",
  "/account(.*)",
  "/class(.*)",
  "/api/decks(.*)",
  "/api/notebooks(.*)",
  "/api/uploads(.*)",
]);

const CLERK_FAPI = "https://frontend-api.clerk.dev";

async function proxyClerkFrontendApi(request: NextRequest) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Clerk proxy is not configured" }, { status: 500 });
  }

  const path = request.nextUrl.pathname.replace(/^\/__clerk/, "") || "/";
  const target = new URL(path + request.nextUrl.search, CLERK_FAPI);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("Host", "frontend-api.clerk.dev");
  headers.set("Clerk-Proxy-Url", `${request.nextUrl.origin}/__clerk`);
  headers.set("Clerk-Secret-Key", secret);
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  headers.set("X-Forwarded-For", clientIp);

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const upstream = await fetch(target, init);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export default clerkMiddleware(
  async (auth, request) => {
    if (request.nextUrl.pathname.startsWith("/__clerk")) {
      return proxyClerkFrontendApi(request);
    }

    if (!isProtectedRoute(request)) {
      return;
    }

    if (request.nextUrl.pathname.startsWith("/api/")) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return;
    }

    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", request.url).toString(),
    });
  },
  {
    authorizedParties: [
      "http://localhost:3000",
      "https://hkstudya.vercel.app",
    ],
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|glb|gltf)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
