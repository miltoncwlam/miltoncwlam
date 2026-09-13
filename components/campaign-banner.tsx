"use client";

import { useTranslations } from "next-intl";

import { isFreeModelCampaignActive } from "@/lib/campaign";

export function CampaignBanner() {
  const t = useTranslations("landing");
  if (!isFreeModelCampaignActive()) return null;

  return (
    <p className="campaign-banner">
      <strong>{t("campaignKicker")}</strong>
      {" · "}
      {t("campaignBody")}
    </p>
  );
}
