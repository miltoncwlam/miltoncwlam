import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayDispatcher } from "@/components/play/play-dispatcher";
import {
  PLAY_CATALOG_IDS,
  PLAY_TEMPLATES,
  isPlayCatalogId,
} from "@/lib/play/templates";
import type { Flashcard } from "@/lib/types/flashcard";

const LAB = [
  ["Harbour tram", "叮叮"],
  ["Red public light bus", "紅van"],
  ["Sitting-out area", "休憩處"],
  ["Milk-tea tile", "花磚"],
  ["Lost umbrella", "長遮"],
  ["Ferry pier", "碼頭"],
  ["Footbridge shops", "天橋"],
  ["Octopus chop", "拍卡"],
  ["Street flyer", "街招"],
  ["Homework tray", "功課"],
] as const;

function labCards(): Flashcard[] {
  const now = new Date(0);
  return LAB.map(([front, back], index) => ({
    id: `lab-${index}`,
    deckId: "lab",
    front,
    back,
    hint: front,
    category: index % 2 === 0 ? "Street" : "Transit",
    cardType: "qa" as const,
    options: null,
    imageUrl: null,
    imageAttribution: null,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));
}

export default async function PlayLabPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { t } = await searchParams;
  const template = t && isPlayCatalogId(t) ? t : "matching-pairs";
  const cards = labCards();

  return (
    <main className="mx-auto max-w-3xl px-3 py-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
        Play lab · local preview
      </p>
      <nav className="mt-3 flex flex-wrap gap-2">
        {PLAY_CATALOG_IDS.map((id) => {
          const name = PLAY_TEMPLATES.find((item) => item.id === id)?.name ?? id;
          const active = id === template;
          return (
            <Link
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                active ? "bg-slate-900 text-amber-100" : "bg-slate-200 text-slate-800"
              }`}
              href={`/play-lab?t=${id}`}
              key={id}
            >
              {name}
            </Link>
          );
        })}
      </nav>
      <div className="mt-5">
        <PlayDispatcher cards={cards} deckId="lab" readOnly template={template} />
      </div>
    </main>
  );
}
