import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/decks(.*)",
  "/community(.*)",
  "/admin(.*)",
  "/account(.*)",
  "/class(.*)",
  "/api/decks(.*)",
  "/api/uploads(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isProtectedRoute(request)) {
    return NextResponse.next();
  }

  const { userId } = await auth();
  if (userId) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(signIn);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|glb|gltf)).*)",
    "/(api|trpc)(.*)",
  ],
};
