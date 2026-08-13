import {
  archiveDeckAction,
  duplicateDeckAction,
  renameDeckAction,
  setDeckFolderAction,
} from "@/lib/actions/decks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeckLibraryControls({
  deckId,
  title,
  folderTag,
  archived,
}: {
  deckId: string;
  title: string;
  folderTag: string | null;
  archived: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-bold text-slate-900">Library</p>
      <p className="mt-1 text-sm text-slate-600">
        Rename, archive, duplicate, or tag a folder.
      </p>

      <form action={renameDeckAction} className="mt-4 flex flex-wrap gap-2">
        <input name="deckId" type="hidden" value={deckId} />
        <Input
          className="min-w-[12rem] flex-1"
          defaultValue={title}
          maxLength={100}
          name="title"
          required
        />
        <Button type="submit" variant="secondary">
          Rename
        </Button>
      </form>

      <form action={setDeckFolderAction} className="mt-3 flex flex-wrap gap-2">
        <input name="deckId" type="hidden" value={deckId} />
        <Input
          className="min-w-[12rem] flex-1"
          defaultValue={folderTag ?? ""}
          maxLength={40}
          name="folderTag"
          placeholder="Folder / tag"
        />
        <Button type="submit" variant="secondary">
          Save tag
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={duplicateDeckAction}>
          <input name="deckId" type="hidden" value={deckId} />
          <Button type="submit" variant="secondary">
            Duplicate
          </Button>
        </form>
        <form action={archiveDeckAction}>
          <input name="deckId" type="hidden" value={deckId} />
          <input
            name="archived"
            type="hidden"
            value={archived ? "false" : "true"}
          />
          <Button type="submit" variant="ghost">
            {archived ? "Restore" : "Archive"}
          </Button>
        </form>
      </div>
    </section>
  );
}
