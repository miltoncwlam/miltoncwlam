"use client";

import type { Flashcard } from "@/lib/types/flashcard";
import {
  resolvePlayTemplate,
  type PlayTemplateId,
} from "@/lib/play/templates";

import { MatchingPairsGame } from "./pairing-games";
import { PlayOptionsProvider, PlayStakeGate, type PlayOptions } from "./play-shell";
import { TypeAnswerGame } from "./recall-games";

function GameFor({
  cards,
  deckId,
  template,
}: {
  cards: Flashcard[];
  deckId: string;
  template: PlayTemplateId;
}) {
  const resolved = resolvePlayTemplate(template);
  switch (resolved) {
    case "matching-pairs":
      return <MatchingPairsGame cards={cards} deckId={deckId} />;
    case "type-the-answer":
      return <TypeAnswerGame cards={cards} deckId={deckId} />;
    default:
      return <p className="empty-state">Unknown activity.</p>;
  }
}

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
  limit?: number;
} & PlayOptions) {
  return (
    <PlayOptionsProvider value={{ readOnly, homeHref, replayHref, deckId, template, classLinkId }}>
      <PlayStakeGate deckId={deckId} template={template}>
        <GameFor cards={cards} deckId={deckId} template={template} />
      </PlayStakeGate>
    </PlayOptionsProvider>
  );
}
