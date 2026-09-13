"use client";

import { useEffect } from "react";

import { enterBetaSession } from "@/components/beta-session";

export default function BetaPage() {
  useEffect(() => {
    enterBetaSession();
    window.location.replace("/");
  }, []);
  return null;
}
