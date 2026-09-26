/** Last inclusive minute: 22 Sep 2026 23:59 UTC. */
export const CAMPAIGN_ENDS_AT = Date.UTC(2026, 8, 23, 0, 0, 0);
/** Version 4.1.0 label flips for everyone at this instant. */
export const V41_RELEASES_AT = Date.UTC(2026, 8, 25, 10, 0, 0);
/** Version 4.2.0 label flips for everyone at this instant. */
export const V42_RELEASES_AT = Date.UTC(2026, 9, 13, 10, 0, 0);
/** Version 4.3.0 label flips for everyone at this instant. */
export const V43_RELEASES_AT = Date.UTC(2026, 9, 31, 10, 0, 0);
/** Version 4.4.0 label flips for everyone at this instant. */
export const V44_RELEASES_AT = Date.UTC(2026, 10, 18, 10, 0, 0);
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

export function isV43Released(now = Date.now()) {
  return now >= V43_RELEASES_AT;
}

export function isV44Released(now = Date.now()) {
  return now >= V44_RELEASES_AT;
}

/** Today queue + exam history — only after the 4.2.0 header flip. */
export function isV42FeaturesLive(now = Date.now()) {
  return isV42Released(now);
}

/** Community ratings, Featured, copy counts, creator profiles — after 4.3.0. */
export function isV43FeaturesLive(now = Date.now()) {
  return isV43Released(now);
}

/** Editable mind map + AI expand/re-branch — after 4.4.0. */
export function isV44FeaturesLive(now = Date.now()) {
  return isV44Released(now);
}
