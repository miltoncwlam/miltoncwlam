import { GENERAL_PACKS } from "./general";
import { HK_JUNIOR_PACKS } from "./hk-junior";
import { HK_PRIMARY_PACKS } from "./hk-primary";
import { HK_SENIOR_PACKS } from "./hk-senior";
import type { CommunitySeedPack } from "./types";

export type { CommunitySeedPack } from "./types";
export { pack, qa } from "./types";

export const COMMUNITY_SEED_PACKS: CommunitySeedPack[] = [
  ...GENERAL_PACKS,
  ...HK_PRIMARY_PACKS,
  ...HK_JUNIOR_PACKS,
  ...HK_SENIOR_PACKS,
];
