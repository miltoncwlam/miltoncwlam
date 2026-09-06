import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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

async function proxyClerkFrontendApi(request: NextRequest, hop = 0): Promise<NextResponse> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Clerk proxy is not configured" }, { status: 500 });
  }

  const path = request.nextUrl.pathname.replace(/^\/__clerk/, "") || "/";
  const target = new URL(path + request.nextUrl.search, CLERK_FAPI);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("accept-encoding");
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

  if (hop < 5 && [301, 302, 303, 307, 308].includes(upstream.status)) {
    const location = upstream.headers.get("location");
    if (location) {
      const nextUrl = new URL(location, request.nextUrl.origin);
      if (nextUrl.hostname === "frontend-api.clerk.dev") {
        nextUrl.host = request.nextUrl.host;
        nextUrl.protocol = request.nextUrl.protocol;
        nextUrl.pathname = nextUrl.pathname.startsWith("/__clerk")
          ? nextUrl.pathname
          : `/__clerk${nextUrl.pathname}`;
      }
      if (nextUrl.pathname.startsWith("/__clerk")) {
        return proxyClerkFrontendApi(
          new NextRequest(nextUrl, { headers: request.headers, method: "GET" }),
          hop + 1,
        );
      }
    }
  }

  // fetch() decompresses gzip/br but leaves Content-Length at the compressed size.
  // Forwarding that length truncates Clerk JS (~88KB of ~322KB) so window.Clerk never loads.
  const body = await upstream.arrayBuffer();
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("set-cookie");
  responseHeaders.set("content-length", String(body.byteLength));
  return new NextResponse(body, {
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
