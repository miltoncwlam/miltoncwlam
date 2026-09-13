/** Last inclusive minute: 22 Sep 2026 23:59 UTC. */
export const CAMPAIGN_ENDS_AT = Date.UTC(2026, 8, 23, 0, 0, 0);
export const FREE_MODEL_CAMPAIGN_RATE = 0.6;

export function isFreeModelCampaignActive(now = Date.now()) {
  return now < CAMPAIGN_ENDS_AT;
}

/** After the campaign, Version 4.0.0 is generally available. */
export function isV4GenerallyAvailable(now = Date.now()) {
  return now >= CAMPAIGN_ENDS_AT;
}
