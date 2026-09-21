/** Last inclusive minute: 22 Sep 2026 23:59 UTC. */
export const CAMPAIGN_ENDS_AT = Date.UTC(2026, 8, 23, 0, 0, 0);
/** Version 4.1.0 label flips for everyone at this instant. */
export const V41_RELEASES_AT = Date.UTC(2026, 8, 25, 10, 0, 0);
/** Version 4.2.0 label flips for everyone at this instant. */
export const V42_RELEASES_AT = Date.UTC(2026, 9, 13, 10, 0, 0);
export const FREE_MODEL_CAMPAIGN_RATE = 0.6;

export function isFreeModelCampaignActive(now = Date.now()) {
  return now < CAMPAIGN_ENDS_AT;
}

/** After the campaign, Version 4.0.0 is generally available. */
export function isV4GenerallyAvailable(now = Date.now()) {
  return now >= CAMPAIGN_ENDS_AT;
}

export function isV41Released(now = Date.now()) {
  return now >= V41_RELEASES_AT;
}

export function isV42Released(now = Date.now()) {
  return now >= V42_RELEASES_AT;
}
