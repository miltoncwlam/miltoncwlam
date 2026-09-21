export const COMMUNITY_SEED_DISPLAY_NAME = "HK Study A";

export function communityCopyPatch(
  trackCommunityCopy: boolean,
  sourceDeckId: string,
) {
  return {
    copiedFromDeckId: trackCommunityCopy ? sourceDeckId : null,
    incrementCopyCount: trackCommunityCopy,
  };
}

export function nextCopyCount(current: number): number {
  const n = Number.isFinite(current) ? Math.max(0, Math.floor(current)) : 0;
  return n + 1;
}

export function communityCreatorName(
  userId: string,
  names: Map<string, string>,
  seedOwner = "system:study-a-community",
): string {
  if (userId === seedOwner) return COMMUNITY_SEED_DISPLAY_NAME;
  return names.get(userId)?.trim() || "Learner";
}
