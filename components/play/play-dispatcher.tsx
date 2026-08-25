"use client";

import type { Flashcard } from "@/lib/types/flashcard";
import {
  resolvePlayTemplate,
  type PlayTemplateId,
} from "@/lib/play/templates";

import { GateDashGame, MazeChaseGame } from "./arcade-games";
import { WhackAMoleGame, WinOrLoseGame } from "./challenge-games";
import {
  DingDingGame,
  EstateCourtGame,
  LastCarGame,
  MinibusStopGame,
  MosaicWallGame,
  StationLostGame,
  StreetFlyersGame,
  TicketChopsGame,
} from "./city-games";
import { MatchingPairsGame } from "./pairing-games";
import { PlayOptionsProvider, PlayStakeGate, type PlayOptions } from "./play-shell";
import { TypeAnswerGame } from "./recall-games";
import { GroupSortGame } from "./sort-games";

function GameFor({
  cards,
  deckId,
  template,
  limit,
}: {
  cards: Flashcard[];
  deckId: string;
  template: PlayTemplateId;
  limit?: number;
}) {
  const resolved = resolvePlayTemplate(template);
  switch (resolved) {
    case "matching-pairs":
      return <MatchingPairsGame cards={cards} deckId={deckId} />;
    case "type-the-answer":
      return <TypeAnswerGame cards={cards} deckId={deckId} />;
    case "group-sort":
      return <GroupSortGame cards={cards} deckId={deckId} />;
    case "win-or-lose":
      return <WinOrLoseGame cards={cards} deckId={deckId} />;
    case "maze-chase":
      return <MazeChaseGame cards={cards} deckId={deckId} />;
    case "whack-a-mole":
      return <WhackAMoleGame cards={cards} deckId={deckId} />;
    case "gate-dash":
      return <GateDashGame cards={cards} deckId={deckId} />;
    case "last-car":
      return <LastCarGame cards={cards} deckId={deckId} />;
    case "ding-ding":
      return <DingDingGame cards={cards} deckId={deckId} limit={limit} />;
    case "estate-court":
      return <EstateCourtGame cards={cards} deckId={deckId} limit={limit} />;
    case "mosaic-wall":
      return <MosaicWallGame cards={cards} deckId={deckId} />;
    case "minibus-stop":
      return <MinibusStopGame cards={cards} deckId={deckId} />;
    case "station-lost":
      return <StationLostGame cards={cards} deckId={deckId} />;
    case "ticket-chops":
      return <TicketChopsGame cards={cards} deckId={deckId} />;
    case "street-flyers":
      return <StreetFlyersGame cards={cards} deckId={deckId} limit={limit} />;
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
  limit,
}: {
  cards: Flashcard[];
  deckId: string;
  template: PlayTemplateId;
  limit?: number;
} & PlayOptions) {
  return (
    <PlayOptionsProvider value={{ readOnly, homeHref, replayHref, deckId, template, classLinkId }}>
      <PlayStakeGate deckId={deckId} template={template}>
        <GameFor cards={cards} deckId={deckId} limit={limit} template={template} />
      </PlayStakeGate>
    </PlayOptionsProvider>
  );
}
