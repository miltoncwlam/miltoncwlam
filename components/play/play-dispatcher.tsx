"use client";

import type { Flashcard } from "@/lib/types/flashcard";
import {
  resolvePlayTemplate,
  type PlayTemplateId,
} from "@/lib/play/templates";

import { MatchingPairsGame } from "./pairing-games";
import { PlayOptionsProvider, PlayStakeGate, type PlayOptions } from "./play-shell";
import { TypeAnswerGame } from "./recall-games";

export function PlayDispatcher({
  cards,
  deckId,
  template,
  readOnly = false,
  homeHref,
  replayHref,
  classLinkId,
}: {
  cards: Flashcard[];
  deckId: string;
  template: PlayTemplateId;
} & PlayOptions) {
  const resolved = resolvePlayTemplate(template);
  const game =
    resolved === "type-the-answer" ? (
      <TypeAnswerGame cards={cards} deckId={deckId} />
    ) : resolved === "matching-pairs" ? (
      <MatchingPairsGame cards={cards} deckId={deckId} />
    ) : (
      <p className="empty-state">Unknown activity.</p>
    );

  return (
    <PlayOptionsProvider
      value={{
        readOnly,
        homeHref,
        replayHref,
        deckId,
        template: resolved ?? template,
        classLinkId,
      }}
    >
      <PlayStakeGate deckId={deckId} template={resolved ?? template}>
        {game}
      </PlayStakeGate>
    </PlayOptionsProvider>
  );
}
