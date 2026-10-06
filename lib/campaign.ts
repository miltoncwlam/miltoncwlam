/** Last inclusive minute: 22 Sep 2026 23:59 UTC. */
export const CAMPAIGN_ENDS_AT = Date.UTC(2026, 8, 23, 0, 0, 0);
/** Version 4.1.0 label flips for everyone at this instant. */
export const V41_RELEASES_AT = Date.UTC(2026, 8, 25, 10, 0, 0);
/** Version 4.2.0: document library. 6 Oct 2026 21:30 HKT. */
export const V42_RELEASES_AT = Date.UTC(2026, 9, 6, 13, 30, 0);
/** Version 4.2.1: each document opens on its own page. 6 Oct 2026 21:45 HKT. */
export const V421_RELEASES_AT = Date.UTC(2026, 9, 6, 13, 45, 0);
/** Version 4.3.0: Today queue and exam history. 24 Oct 2026 10:00 UTC. */
export const V43_RELEASES_AT = Date.UTC(2026, 9, 24, 10, 0, 0);
/** Version 4.4.0: community. 11 Nov 2026 10:00 UTC. */
export const V44_RELEASES_AT = Date.UTC(2026, 10, 11, 10, 0, 0);
/** Version 4.5.0: editable mind map. 29 Nov 2026 10:00 UTC. */
export const V45_RELEASES_AT = Date.UTC(2026, 10, 29, 10, 0, 0);
/** Header patch for the mind-map fix. */
export const V411_RELEASES_AT = Date.UTC(2026, 9, 6, 0, 0, 0);
/** Header shows 4.1.2 until the 4.2 document library opens. */
export const V412_RELEASES_AT = Date.UTC(2026, 9, 6, 12, 0, 0);
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

export function isV421Released(now = Date.now()) {
  return now >= V421_RELEASES_AT;
}

export function isV43Released(now = Date.now()) {
  return now >= V43_RELEASES_AT;
}

export function isV44Released(now = Date.now()) {
  return now >= V44_RELEASES_AT;
}

export function isV45Released(now = Date.now()) {
  return now >= V45_RELEASES_AT;
}

export function isV411Released(now = Date.now()) {
  return now >= V411_RELEASES_AT;
}

export function isV412Released(now = Date.now()) {
  return now >= V412_RELEASES_AT;
}

/** Document library — only after the 4.2.0 header flip. */
export function isV42FeaturesLive(now = Date.now()) {
  return isV42Released(now);
}

/** Today queue + exam history — after 4.3.0. */
export function isV43FeaturesLive(now = Date.now()) {
  return isV43Released(now);
}

/** Community ratings, Featured, copy counts, creator profiles — after 4.4.0. */
export function isV44FeaturesLive(now = Date.now()) {
  return isV44Released(now);
}

/** Editable mind map + AI expand/re-branch — after 4.5.0. */
export function isV45FeaturesLive(now = Date.now()) {
  return isV45Released(now);
}
