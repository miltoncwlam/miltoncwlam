import {
  archiveDeckAction,
  duplicateDeckAction,
  renameDeckAction,
  setDeckFolderAction,
} from "@/lib/actions/decks";

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
        <input
          className="field min-w-[12rem] flex-1"
          defaultValue={title}
          maxLength={100}
          name="title"
          required
        />
        <button className="secondary-button" type="submit">
          Rename
        </button>
      </form>

      <form action={setDeckFolderAction} className="mt-3 flex flex-wrap gap-2">
        <input name="deckId" type="hidden" value={deckId} />
        <input
          className="field min-w-[12rem] flex-1"
          defaultValue={folderTag ?? ""}
          maxLength={40}
          name="folderTag"
          placeholder="Folder / tag"
        />
        <button className="secondary-button" type="submit">
          Save tag
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={duplicateDeckAction}>
          <input name="deckId" type="hidden" value={deckId} />
          <button className="secondary-button" type="submit">
            Duplicate
          </button>
        </form>
        <form action={archiveDeckAction}>
          <input name="deckId" type="hidden" value={deckId} />
          <input
            name="archived"
            type="hidden"
            value={archived ? "false" : "true"}
          />
          <button className="text-button" type="submit">
            {archived ? "Restore" : "Archive"}
          </button>
        </form>
      </div>
    </section>
  );
}
