"use client";

import type { Flashcard } from "@/lib/types/flashcard";
import type { PlayTemplateId } from "@/lib/play/templates";

import { AirplaneGame, MazeChaseGame } from "./arcade-games";
import {
  BalloonPopGame,
  GameshowQuizGame,
  ImageQuizGame,
  OpenTheBoxGame,
  WhackAMoleGame,
  WinOrLoseGame,
} from "./challenge-games";
import { LabelledDiagramGame, LabelMatchGame } from "./diagram-games";
import {
  FindTheMatchGame,
  MatchingPairsGame,
  MatchUpGame,
} from "./pairing-games";
import { CrosswordGame, WordsearchGame } from "./puzzle-games";
import { PlayOptionsProvider, PlayStakeGate, type PlayOptions } from "./play-shell";
import {
  ClozeGame,
  HangmanGame,
  SpeakingCardsGame,
  SpellWordGame,
  TypeAnswerGame,
} from "./recall-games";
import {
  GroupSortGame,
  OddOneOutGame,
  RankOrderGame,
  TrueFalseGame,
} from "./sort-games";

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
  const game = (() => {
    switch (template) {
    case "match-up":
      return <MatchUpGame cards={cards} deckId={deckId} />;
    case "matching-pairs":
      return <MatchingPairsGame cards={cards} deckId={deckId} />;
    case "find-the-match":
      return <FindTheMatchGame cards={cards} deckId={deckId} />;
    case "type-the-answer":
      return <TypeAnswerGame cards={cards} deckId={deckId} />;
    case "spell-the-word":
      return <SpellWordGame cards={cards} deckId={deckId} mode="spell-the-word" />;
    case "unjumble":
      return <SpellWordGame cards={cards} deckId={deckId} mode="unjumble" />;
    case "hangman":
      return <HangmanGame cards={cards} deckId={deckId} />;
    case "complete-the-sentence":
      return <ClozeGame cards={cards} deckId={deckId} />;
    case "true-or-false":
      return <TrueFalseGame cards={cards} deckId={deckId} />;
    case "open-the-box":
      return <OpenTheBoxGame cards={cards} deckId={deckId} />;
    case "group-sort":
      return <GroupSortGame cards={cards} deckId={deckId} />;
    case "odd-one-out":
      return <OddOneOutGame cards={cards} deckId={deckId} />;
    case "rank-order":
      return <RankOrderGame cards={cards} deckId={deckId} />;
    case "image-quiz":
      return <ImageQuizGame cards={cards} deckId={deckId} />;
    case "crossword":
      return <CrosswordGame cards={cards} deckId={deckId} />;
    case "wordsearch":
      return <WordsearchGame cards={cards} deckId={deckId} />;
    case "gameshow-quiz":
      return <GameshowQuizGame cards={cards} deckId={deckId} />;
    case "win-or-lose":
      return <WinOrLoseGame cards={cards} deckId={deckId} />;
    case "speaking-cards":
      return <SpeakingCardsGame cards={cards} deckId={deckId} />;
    case "whack-a-mole":
      return <WhackAMoleGame cards={cards} deckId={deckId} />;
    case "balloon-pop":
      return <BalloonPopGame cards={cards} deckId={deckId} />;
    case "speed-sort":
      return <GroupSortGame cards={cards} deckId={deckId} timed />;
    case "maze-chase":
      return <MazeChaseGame cards={cards} deckId={deckId} />;
    case "airplane":
      return <AirplaneGame cards={cards} deckId={deckId} />;
    case "labelled-diagram":
      return <LabelledDiagramGame cards={cards} deckId={deckId} />;
    case "label-match":
      return <LabelMatchGame cards={cards} deckId={deckId} />;
    default:
      return <p className="empty-state">Unknown activity.</p>;
    }
  })();

  return (
    <PlayOptionsProvider value={{ readOnly, homeHref, replayHref, deckId, template, classLinkId }}>
      <PlayStakeGate deckId={deckId} template={template}>
        {game}
      </PlayStakeGate>
    </PlayOptionsProvider>
  );
}
