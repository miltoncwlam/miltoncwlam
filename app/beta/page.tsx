"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { enterBetaSession } from "@/components/beta-session";

export default function BetaPage() {
  const router = useRouter();

  useEffect(() => {
    enterBetaSession();
    router.replace("/");
  }, [router]);

  return null;
}
