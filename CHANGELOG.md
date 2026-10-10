# Changelog

**Version 4.4.8** — one number only (`package.json`).

Git has 41 commits (31 on `milton`). Chat turns are not versions.

## Remotes

| Remote | GitHub | Role |
| --- | --- | --- |
| `origin` | [aailckw/interns-ai-flashcard](https://github.com/aailckw/interns-ai-flashcard) | `milton` is study-only `19d7f9c`. Do not force-push. |
| `miltoncwlam` | [miltoncwlam/miltoncwlam](https://github.com/miltoncwlam/miltoncwlam) | **`milton`** → [hkstudya.vercel.app](https://hkstudya.vercel.app). Same commit is still on `ai-flashcard` until Vercel production is switched. |

```bash
git checkout v1.0    # Version 1.0.0
git checkout v1.1    # Version 1.1.0
git checkout archive/study-only-production
git checkout archive/play-core-two
git checkout archive/milton-2026-09-06
```

---

## Version 4.7.1 — 2026-10-10

**Miniscule.** A PDF with maps and diagrams now finishes reading those pictures.

### Fixed
- **Figure pages**: After the selectable text is read, pages with a large map, diagram, or timeline are read too. Their labels are added to the source. History Topic 1 now includes the civilisation names from the map.

---

## Version 4.7.0 — 2026-10-06

**Minor.** Each document is its own page, and a slow model finishes a shorter cut instead of stopping.

### Added
- **Document page**: Source, study notes, the mind map, the exam, and flashcards each open on their own page. Back returns to the notebook.
- **Delete document**: Notes, the mind map, the exam, and flashcards can be deleted from that page. The source stays.

### Changed
- **Header**: Version 4.2.1 from 6 Oct 2026, 9:45 PM HKT. Today, community, and the editable mind map stay on their later clocks.

### Fixed
- **Slow model**: If a generate runs long, it tries once on a shorter cut of the source, then writes notes, a map, an exam, or cards from that cut. The notebook no longer stops on “The model took too long.”

Existing notes, mind maps, and exam papers were removed. Cards and sources stay.

---

## Version 4.6.0 — 2026-10-06

**Minor.** A notebook opens as documents.

### Added
- **Document library**: The notebook shows a Source button, one button per saved document, and the generate tiles. Opening a button shows only that document. Chat stays underneath.
- **Requirements**: A box under the generate settings is sent with study notes, the mind map, the exam, and the cards.
- **Another study note**: Generating study notes adds a document. The mind map and the exam still replace their one document. Cards stay one set, opened from Flashcards when any exist.

### Changed
- **Header**: Version 4.1.2 until 6 Oct 2026, 9:30 PM HKT, then Version 4.2.0 when this library opens. Today and exam history are Version 4.3.0 on 24 Oct. Community is Version 4.4.0 on 11 Nov. An editable mind map is Version 4.5.0 on 29 Nov.
- **Exam options**: HKDSE, IGCSE, A-level, the time limit, and question types appear after Exam is chosen.

Existing notebooks become those document buttons. Nothing is regenerated.

---

## Version 4.5.2 — 2026-10-06

**Miniscule.** Study notes drop the worksheet and then get a cleanup pass.

### Fixed
- **Study notes**: Questions, fill-in blanks, activities, syllabus boxes, and headings named Summary are removed after the notes are written. A second pass tidies what remains. Years such as 7000000 are written as 7,000,000. The header stays 4.1.1.

---

## Version 4.5.1 — 2026-10-06

**Miniscule.** The header shows 4.1.1.

### Changed
- **Header**: The header and footer say Version 4.1.1. Version 4.2.0 still waits until 13 Oct.

---

## Version 4.5.0 — 2026-10-06

**Minor.** The header shows Version 4.5.0 now. Queued features stay on their dates.

### Changed
- **Version label**: The header and footer say Version 4.5.0 immediately. Today, community, and mind-map editing still open on 13 Oct, 31 Oct, and 18 Nov.

---

## Version 4.4.10 — 2026-10-06

**Miniscule.** Mind maps sit in a real tree, and a stalled generate still leaves a map.

### Changed
- **Mind map**: The topic sits in the center. Branches and facts are columns beside it, with the full label visible. Lines meet the bubble instead of running through it. The map opens centered on the topic. Deeper nodes stay on the map.
- **Print map**: Print map prints the map. The print style stays until the dialog closes.

### Fixed
- **Mind map generate**: A long source is read in smaller slices. If the model times out or returns nothing, the map is built from the source’s headings and bullets instead of failing.

---

## Version 4.4.9 — 2026-10-05

**Miniscule.** PDF uploads keep every page, and earlier notebooks get the text that was cut off.

### Changed
- **PDF upload**: The 10 MB app cap and the 10-page OCR cap are gone. A selectable PDF stores its full text. A scan is read one page at a time until the last page. The storage host allows files up to 50 MB.

### Fixed
- **Earlier PDFs**: Star Voyager’s text is stored again. The 12-page Chinese History scan and the matching notebook now include pages 11 and 12. World History was already complete.

---

## Version 4.4.8 — 2026-10-05

**Miniscule.** Printing notes prints the notes, with visible summary points.

### Fixed
- **Print notes**: Print notes keeps only the notes sheet (not the source, chat, or studio). Summary points show a bullet. The print style stays on until the print dialog closes. The English print-pack label is no longer 溫習包.

---

## Version 4.4.7 — 2026-10-05

**Miniscule.** Notebook chat stays in the notebook’s language.

### Fixed
- **English chat on English notebooks**: Tutor replies follow the notebook language. An HKDSE lane or a few Chinese words in the source no longer switch an English notebook to Traditional Chinese.

---

## Version 4.4.6 — 2026-10-05

**Miniscule.** Study notes are a point-form summary, not a glossary.

### Changed
- **Point-form notes**: Headings follow the source’s topics. Each heading is short summary bullets (one idea per line). Glossary buckets (Key terms / Facts / How to remember) are no longer the notes format, including when a call is slow.

---

## Version 4.4.5 — 2026-10-05

**Miniscule.** Study notes follow the source’s topics instead of three generic bullet buckets.

### Changed
- **Notes as a revision page**: The model is asked for `##` headings from the source, a short explanation under each, then terms/dates. Generic “Key terms / Facts / How to remember” is only for word-list sources. Topic slices concatenate instead of being dumped into one glossary.

---

## Version 4.4.4 — 2026-10-05

**Miniscule.** Study notes finish instead of dying on “The model took too long.”

### Fixed
- **Notes generation timeout**: Notes run in 4k slices with a 40s cap per call (not one 150s 12k request). If a slice still aborts, the source is shaped into the study sheet so the job completes.

---

## Version 4.4.3 — 2026-10-01
`e8b92ea`

**Miniscule.** Long PDF OCR no longer stalls mid-read when the between-page kick drops.

### Fixed
- **OCR page chaining**: Process route keeps ticking pages in-request (within the function budget) and re-enqueues when time runs out, so notebooks do not freeze on “Reading page N of M”.
- **Stale OCR re-kick**: Jobs poll and the generation banner re-start idle or reclaimable ingest work; Retry also works while still processing.

---

## Version 4.4.2 — 2026-09-26

**Miniscule.** Version number and features stay aligned: 4.2+ capabilities unlock only when the header flips.

### Fixed
- **Feature clocks**: Today (`/review`), exam history, community ratings / Featured / copy counts / creator profiles, and editable AI mind-map canvas stay off until their release clocks (13 Oct, 31 Oct, 18 Nov 2026 10:00 UTC). Public users on **Version 4.1.0** only get through mistake book + print pack.

---

## Version 4.4.1 — 2026-09-21

**Miniscule.** Fast card speech caching with native speech fallback and expanded connection pooling.

### Fixed
- **Card speech caching & fallback**: Added client-side audio blob cache and server in-memory buffer cache for TTS. Spoken card prompts and answers now play instantly on repeat, and automatically fall back to browser `speechSynthesis` if remote TTS exceeds 1.5s.
- **Connection pooling**: Expanded local database pool from 5 to 15 connections to prevent request queuing during concurrent spikes.

---

## Version 4.4.0 — 2026-09-21

**Minor.** AI canvas: the mind map is editable. Unlocks with the header at 18 Nov 2026 10:00 UTC.

### Added
- **Interactive mind map** in the notebook: select a node, drag it onto another to re-parent, double-click to rename, add or remove a child.
- **Expand with AI** and **Re-branch with AI** on a selected node. New branches save back into the mind-map artifact. Community packs stay read-only.

### Changed
- `displayAppVersion` checks clocks newest-first: 4.4.0 from 18 Nov 10:00 UTC, then 4.3.0, 4.2.0, 4.1.0, 4.0.0.
- Energy reset (expire `period_end` so the next visit refills to 600) at 18 Nov 2026 10:00 UTC when the 4.4.0 label flips.
- Canvas edit and AI expand stay gated behind that same clock (see Version 4.4.2).

---

## Version 4.3.0 — 2026-09-21

**Minor.** Community depth: 1–5 star ratings (likes stay), a Featured row, copy counts, and creator profiles. Unlocks with the header at 31 Oct 2026 10:00 UTC.

### Added
- **1–5 star ratings** on community packs, next to likes. One rating per signed-in user; changing stars updates the average. List cards and pack pages show `★ 4.6 (12)`.
- **Copy counts** when someone copies a public pack to their library (class copies are not counted). Shown on cards and the pack page.
- **Featured** row on `/community`: `is_featured` packs in a horizontal scroller (grid on large screens). Other public packs stay grouped by subject.
- **Creator profiles** at `/community/u/[userId]`: public packs plus total copies. Cards and pack pages link “by {name}”. Seed packs show **HK Study A**. Comments show the author’s name.

### Changed
- `displayAppVersion` checks clocks newest-first: 4.3.0 from 31 Oct 10:00 UTC, then 4.2.0, 4.1.0, 4.0.0.
- Energy reset (expire `period_end` so the next visit refills to 600) at 31 Oct 2026 10:00 UTC when the 4.3.0 label flips.
- Ratings, Featured, copy counts, and creator profiles stay gated behind that same clock (see Version 4.4.2).

---

## Version 4.2.0 — 2026-09-21

**Minor.** One Today queue across notebooks, plus exam history. Unlocks with the header at 13 Oct 2026 10:00 UTC.

### Added
- **Today** at `/review`: due flashcards and due mistake-book items from every active notebook, mixed by due date (cap 50). Rate cards with SM-2; drill 錯題 with the same auto-check / self-rate flow as the mistake book.
- Header **Today** link with due count, and a Today card on the notebook library.
- **Past sittings** on the exam page: score %, trend vs the previous sitting, and a sparkline of the last 10.

### Changed
- `displayAppVersion` checks clocks newest-first: 4.2.0 from 13 Oct 10:00 UTC, 4.1.0 from 25 Sep 10:00 UTC, 4.0.0 after 22 Sep 23:59 UTC.
- Energy reset at 13 Oct 2026 10:00 UTC when the 4.2.0 label flips.
- Today and exam history stay gated behind that same clock (see Version 4.4.2).

---

## Version 4.1.1 — 2026-09-21

**Miniscule.** Public beta stays labelled **Version 4.0.0**. The 4.1.0 header waits until 25 Sep 2026 10:00 UTC.

### Changed
- Beta popup and campaign banner say Version 4.0.0 again. Header shows `4.0.0 beta` in beta, `4.0.0` after 22 Sep 23:59 UTC, then `4.1.0` at 25 Sep 10:00 UTC.
- Energy reset (expire `period_end` so the next visit refills to 600) at 22 Sep 23:59 UTC and again at 25 Sep 10:00 UTC.

---

## Version 4.1.0 — 2026-09-21

**Minor.** Sit again from what you missed. 錯題本 + 溫習包.

### Added
- **Mistake book (錯題本)** at `/decks/[id]/mistakes`. Every question that loses marks in a sat paper lands there with your answer and the marker feedback. Drill due questions: MCQ, true/false, matching, and exact cloze answers auto-check; written answers show the mark scheme and you rate hard / ok / easy.
- Wrong items follow SM-2 (`exam_wrong_items` table). An item retires after the third drill when the latest rating is easy; you can also remove one by hand. Missing the same question on a re-sit refreshes it and restarts its schedule.
- **Print pack (溫習包)** at `/decks/[id]/print`: study notes and the exam paper as one print-ready document, answer key on its own page.
- After marking, the result screen says how many questions went into the mistake book and links to it.
- The notebook page links to the mistake book (with due count) and the print pack.

### Changed
- Header stays on 4.0.0 until 25 Sep 2026 10:00 UTC. Mistake book and print pack are live for beta users now.

---

## Version 4.0.0 beta — 2026-09-12

**Major.** Drop a source. Stay in the notebook. Chat or tap — it makes things you can sit, in HKDSE, IGCSE, or A-level shape.

### Added
- Create opens the notebook (`/decks/[id]`), not the library.
- Auto study notes after ingest finishes. Guest trial is ingest plus this one notes run.
- Notebook chat, pinned to DeepSeek V4 Flash 0731. Replies persist. DSE + Chinese uses 書面語. You can say “make cards”.
- Exam lane chips: HKDSE (default), IGCSE, A-level. They shape notes, maps, papers, and cards.
- Long sources generate notes and maps in sections, then merge.
- Home offers **Version 4.0.0 beta**. Production home shows Version 3.9.3 until you enter. **Not now**, Escape, or a click outside closes the popup — you do not have to enter. That stay is this visit only. Tick **Do not show again** to remember enter or hide in a cookie.
- Until **22 Sep 2026 23:59 UTC**, listed catalog models take **60% energy**. Create offers one campaign option for that. It does not list rotating OpenRouter names. Auto stays Auto in Budget. After that minute, Version 4.0.0 leaves beta.
- In beta, a **Beta feedback** panel for comments and bug reports. Crashes and uncaught errors in 4.0.0 beta are recorded automatically.

### Changed
- Create is drop-first. Model, language, and retention sit under Advanced.
- Studio tiles can run in parallel.
- Class links stay on `/decks/[id]/class`, not the notebook aside.
- Landing copy is stay-in-the-notebook, with an exam-paper hero.
- The beta cookie is only set if you tick **Do not show again**. Enter without it stays in this browser tab.
- After 22 Sep 2026 23:59 UTC the home popup goes away and the header shows **Version 4.0.0**.
- Privacy, Terms, and the Cookie Notice describe the notebook, chat, guest trial, exam lanes, and the cookies we actually set (`hk_guest_uid`, `hkstudya-beta`, language). They do not call listed models free.

### Fixed
- Failed notes no longer crash the notebook page.
- Notes that skip headings still become a study sheet from leftover sentences.
- Create no longer lists rotating catalog models beside Auto, so the picker is not two routers.
- Studio energy no longer bills a whole scanned PDF. Notes, maps, papers, and cards are charged for the extracted slice (notes and maps up to three sections), so the hold is closer to what generate actually uses.

### Removed
- Leftover `/api/decks/generate` routes and regenerate-deck actions that wiped source.

---

## Version 3.9.3 — 2026-09-10

**Miniscule.** New notebooks use a newer OpenRouter Flash pin. Scans use Qwen 3.8.

### Changed
- Default generate is now **DeepSeek V4 Flash 0731** (`deepseek/deepseek-v4-flash-0731`). It is cheaper than the old V4 Flash alias and still returns structured JSON.
- Scan OCR now uses **Qwen 3.8 Flash** (`qwen/qwen3.8-flash`). Create also offers **DeepSeek V4.1 Flash** for a stronger paid option.
- Older DeepSeek V4 Flash and Qwen 3.7 Flash notebooks still bill at their previous energy rates.

---

## Version 3.9.2 — 2026-09-10

**Miniscule.** Production can ship again. The header and footer show **Version 3.9.2** so you can see what is live.

### Added
- Header and footer show **Version x.y.z** from `package.json`.

### Fixed
- Removed the `/s` regex flag that made GitHub `quality` (typecheck, ES2017) fail and blocked Vercel after 3.9.1.

---

## Version 3.9.1 — 2026-09-10

**Miniscule.** Existing study notes and mind maps read as cards, not a colon wall or squeezed labels.

### Fixed
- Term cards drop the leading `：` and trailing dash when the model put the meaning on the next line.
- Traditional Chinese notes ask for textbook 書面語 (的, not 嘅).
- Mind-map chips are wider and no longer break mid-phrase (`周平王東遷`). One idea per node in the prompt.

---

## Version 3.9.0 — 2026-09-10

**Minor.** Studio generates four study tools from the same notebook, with poster mind maps and community copies that still have a source.

### Added
- Shared Generate settings: Depth (Basic / Detailed) and Purpose (First look / Exam revision) apply to notes, mind map, exam, and flashcards.
- Flashcards as a fourth studio tile. Cards land on the same notebook without wiping the source, so notes and maps stay available.
- Poster mind maps: pastel rounded cards, children in a column beside each branch, and arrow connectors on a cream canvas. Show all is the default.

### Changed
- Community copy keeps real source (or rebuilds study text from cards when the pack was a `seed:` stub), and copies notes, maps, and exams with the cards.
- Publish accepts a complete notebook with cards or a studio item, not cards-only.
- Community catalog and detail pages talk about notebooks and show map, notes, exam, and cards when they exist.

### Fixed
- Basic depth slices a shorter source (~12k) so long PDFs are less likely to hit the 150s abort when regenerating notes or a map.

---

## Version 3.8.2 — 2026-09-10

**Miniscule.** Production can ship again. GitHub quality was blocking Vercel on a duplicated process route and a nullable exam mark in tests.

### Fixed
- Removed a copied `POST` handler in the notebook OCR tick route so typecheck can pass.
- Optional-chain exam mark results in studio tests so `tsc` does not fail the required quality check.

---

## Version 3.8.1 — 2026-09-10

**Miniscule.** Study notes and mind maps stay in the same language as the notebook, and they are readable instead of a wall of overlapping text.

### Changed
- Traditional Chinese notes use 重點詞彙 / 史實與脈絡 / 記誦提示 instead of English Key terms / Facts / How to remember.
- Mind-map labels are required in the same language, with short Chinese bubbles instead of English “2–6 words” titles like Unit 1.
- Notes split glued `詞：定義` walls into term cards. The mind map starts with branches collapsed so labels do not stack on top of each other.

### Fixed
- Existing Chinese notes that arrived as one paragraph (`Key terms- 舊石器時代: …。- 新石器時代:`) now parse into real headings and a list.

---

## Version 3.8.0 — 2026-09-10

**Minor.** Create a notebook and leave. Come back to Library when it is ready. Class scores now include exams.

### Added
- Create and studio generate return immediately. A slim banner plus the Generating badge replace the full-screen overlay, so you can open other notebooks while reading/writing continues.
- Server ticks keep OCR going after you close the tab: one scan page per request, up to 10 pages, with partial text saved if a later page fails.
- Failed notebooks stay in Incomplete with Retry instead of disappearing.
- Class scoreboard lists exam attempts next to play runs, and shows Clerk names when available.
- Traditional Chinese exam papers use 正確/錯誤, and the landing page leads with exam / class / 繁體 scans.

### Changed
- Guest trial count ignores refunded failed generates, so a timeout no longer burns the two-try quota.
- Class join copies the exam/notes/mind map onto the student notebook and tags the copy with the class link.
- Studio tiles stay usable while a job runs in the background.

### Fixed
- Dense scans were capped at 3 pages inside one 180s request. Pages now run one-at-a-time so a 中史 photocopied chapter can finish.

---

## Version 3.7.4 — 2026-09-09

**Miniscule.** Dense scanned PDFs finish reading instead of dying on timeout or Invalid JSON.

### Fixed
- OCR sends page images as file bytes (not a Node `Buffer`), so OpenRouter no longer returns `Invalid JSON response`.
- The first scan page can use most of the time budget; extra pages stop once we have text, so title-save still fits in 180s.
- Invalid JSON is treated as a skippable/retryable page error and mapped to a friendly retry hint.
- The S1 中華民族與早期國家的起源 12-page JPEG scan now OCRs instead of “Reading this scan took too long.”

---

## Version 3.7.3 — 2026-09-09

**Miniscule.** Study notes follow the language you picked, and the sheet is readable.

### Fixed
- Choosing 繁體中文 on create now sets the app language, so studio notes/exams are not generated in English.
- Notes prompts require full Traditional Chinese (Hong Kong wording), not English with Chinese glosses.
- Notes hide `xn--` punycode junk, render `**bold**`, and split a wall of text into headings and lists.

---

## Version 3.7.2 — 2026-09-09

**Miniscule.** Same study PDF and Wikipedia URLs every time we test create-notebook.

### Added
- `tests/fixtures/hk-dse-photosynthesis.pdf` (selectable notes) and a 2-page scan PDF, plus Wikipedia photosynthesis/chloroplast links in `tests/fixtures/test-sources.ts`.

---

## Version 3.7.1 — 2026-09-09

**Miniscule.** Scan OCR finishes a page instead of dying at 28s with no text.

### Fixed
- OCR copies JPEG bytes out of the PDF so we don’t upload the whole file as one image.
- The first page gets ~80s; a slow page retries as a smaller photo instead of skipping every page.

---

## Version 3.7.0 — 2026-09-09

**Minor.** Guest sign-in so you can try the app without an email.

### Added
- Landing and sign-in have **Try as guest**. Guests get two generates (a notebook plus one studio run), then a prompt to create a free account.
- Guest sessions hide the energy meter and gift-code box. Create-notebook still works for a trial scan.

### Changed
- Sign-up while already a guest sends you to Account to add an email and keep the same library.

---

## Version 3.6.3 — 2026-09-09

**Miniscule.** Notebook create no longer dies at 50s on a photo-PDF.

### Fixed
- OCR shrinks scan JPEGs, reads one page at a time, and keeps any pages that finish so a 10-page book scan can create a notebook.
- Overlay says to try fewer pages or paste the text when the scan read hits the time budget.

---

## Version 3.6.2 — 2026-09-09

**Miniscule.** Scanned PDFs no longer fail notebook create with a Node `path` type error.

### Fixed
- OCR now reads JPEG images already inside the PDF (the `/Length 55876` stream) instead of asking pdf.js to rasterize them as a filesystem path.
- Create-notebook overlay explains a scan read failure instead of showing the raw Node error.

---

## Version 3.6.1 — 2026-09-09

**Miniscule.** Production typecheck: notebook ingest still imports OCR energy helpers.

### Fixed
- `app/api/notebooks/route.ts` imports `estimateArtifactCredits` and `estimateOcrCredits` so CI can typecheck.

---

**Minor.** Scanned PDFs are transcribed in-app with OCR (up to 10 pages) so you can create a notebook from a book photo without pasting text first.

### Added
- If a PDF has no selectable text, the app rasterizes pages and reads them with Qwen 3.7 Flash, then stores that text as the notebook source.

### Changed
- Create-notebook charges OCR energy (per page) plus the short title call. Large PDFs show a higher estimate on the form.
- Flashcard generate and later studio reads use the same OCR fallback.

### Fixed
- Empty scans no longer dead-end on “paste or OCR it first” when the model can read the page images.

---

**Miniscule.** Production typecheck: empty-PDF error can see the file type.

### Fixed
- `extractStudyText` passes MIME type into the empty-text helper so `npm run build` / CI typecheck can finish.

---

**Minor.** Create-notebook energy is a small title-read, not file size. Gift code on Account (and Create) unlocks unlimited energy. Scanned PDFs ask you to paste or OCR instead of blocking with a huge energy bill.

### Added
- Gift code field on **Account** and Create notebook. Redeeming the reusable code turns on unlimited energy for that signed-in account.

### Changed
- Notebook create extracts the source first, then charges for the short title call (first 6,000 characters), not the PDF’s megabytes.
- File token guesses are capped. A PDF is not auto-treated as a 3× scan just because the browser has not extracted text yet.

### Fixed
- Uploading a scanned or image-heavy PDF no longer asks for tens of thousands of energy to open a notebook. Empty scans explain that the file has no selectable text.

---

## Version 3.4.1 — 2026-09-08

**Miniscule.** Study notes typecheck: paragraph blocks are a separate `p` type so `npm run build` can finish.

---

## Version 3.4.0 — 2026-09-08

**Minor.** Studio mind maps draw as a radial map. Study notes look like a revision sheet and print/save as PDF. Mind map and notes generation can run for up to 3 minutes so they stop dying at 45 seconds.

### Added
- Radial mind map (centre topic, coloured branches, click to collapse, Print map).
- **Print notes** (browser Save as PDF).

### Changed
- Mind-map prompt: one rooted study map, 4–7 distinct branches, facts on leaves.
- Notes: key terms / facts / how to remember; no duplicate `#` title; paper typography.
- Artifacts route `maxDuration` 180s; mind map and notes abort at 150s.

### Fixed
- Orphan mind-map nodes attach to the root instead of becoming extra trees. Cycles are broken.

---

## Version 3.3.0 — 2026-09-08

**Minor.** Exam taking works like a paper: MCQ radios and matching dropdowns, a minutes picker before generate (that also sizes the paper), a countdown that auto-submits, print/save PDF, and partial marks instead of yes/no zeros.

### Added
- Studio **Time limit (minutes)** (10–90). No question-count field — longer papers get more questions, and long items count for more time than MCQ/TF.
- Countdown on take-exam that auto-submits at 0. Refresh keeps the same start time.
- **Print paper** and **Print results** (browser Save as PDF).

### Changed
- Written answers can score `MARKS: k/max` (a “fraction of marks” no longer becomes 0/6). Matching scores per pair.
- Generate asks for exactly the planned number of questions (`q1`…`qN`) and fills in if the model comes up short.

### Fixed
- MCQ with `options` instead of `choices` now shows lettered radios. Matching without `pairs` is rebuilt from `left -> right` answer lines, not a text box.
- Marker timeouts show “Could not mark… submit again” instead of a silent 0.

---

## Version 3.2.7 — 2026-09-08

**Miniscule.** Sign-in and sign-up sit in a scaled card beside the brand panel. Server Clerk auth uses the `/__clerk` proxy. My decks / generate show a wake-up note if the database is offline instead of a crash.

---

## Version 3.2.6 — 2026-09-06

**Miniscule.** `/__clerk` forwards Clerk `__client` / `__session` cookies onto the app host, so typing a password no longer flips the widget to “You are signed out”.

---

## Version 3.2.5 — 2026-09-06

**Miniscule.** Sign-in and sign-up fill the window instead of a small card.

---

## Version 3.2.4 — 2026-09-06

**Miniscule.** Clerk `/__clerk` proxy no longer truncates `clerk.browser.js` (gzip `Content-Length` vs decompressed body). Sign-in can finish loading on https://hkstudya.vercel.app.

---

## Version 3.2.3 — 2026-09-06

**Miniscule.** Absolute Clerk `proxyUrl` + `clerkJSUrl` so `/sign-in` does not 500 (`window is not defined` from relative `/__clerk` on the server). Local Clerk JS stays on `http://localhost:3000`.

---

## Version 3.2.2 — 2026-09-06

**Miniscule.** Clerk `proxyUrl` is `/__clerk` (current page origin: `http://localhost:3000` locally). Import `NextRequest` as a value so Vercel typecheck can follow JS 307s.

---

## Version 3.2.1 — 2026-09-06

**Miniscule.** Clerk `/__clerk` proxy follows JS redirects so the sign-in widget can load instead of staying on “Loading sign-in…”.

---

## Version 3.2.0 — 2026-09-06

**Minor.** Email-only Clerk. Production on `*.vercel.app` cannot use `clerk.hkstudya.vercel.app` (connection closed). Sign-in stays on the site; Frontend API is proxied at `/__clerk`.

---

## Version 3.1.7 — 2026-09-06

**Miniscule.** `npm run typecheck` runs `next typegen` first so CI does not fail on generated `PageProps` / `LayoutProps`.

---

## Version 3.1.6 — 2026-09-06

**Miniscule.** Pin `@swc/helpers@0.5.23` so GitHub `npm ci` on `ai-flashcard` matches the lockfile (optional SWC peer).

---

## Version 3.1.5 — 2026-09-06

**Miniscule.** Vercel build is `next build` only. Unit tests stay in GitHub CI / local `npm test` with `NODE_ENV=test`, so production env (`NEXT_PUBLIC_VERCEL_ENV`, no React `act`) cannot fail a deploy.

---

## Version 3.1.4 — 2026-09-06

**Miniscule.** Studio generate retries schema/JSON once (not timeouts). `[generate]` logs. Studio Retry + friendly errors. Vercel build runs `npm test` before `next build`.

---

## Version 3.1.3 — 2026-09-06

Rule: **Version x.y.z** only. Major = +1.0.0, minor = +0.1.0, miniscule = +0.0.1. Changelog headings match `package.json`; no second number for the same release.

---

## Version 3.1.2 — 2026-09-06

One changelog file (removed `VERSION-LOG.md`). Every `milton` commit listed with full commit body.

---

## Version 3.1.1 — 2026-09-06 — `99d0deb`

Archive branches/tags on both GitHub remotes. Cursor versioning rule. First combined snapshot log.

---

## Version 3.1.0 — 2026-08-31 — `549bce7`

**Minor.** Sign-in/up **307** to Clerk Account Portal (`*.accounts.dev`) with `redirect_url=https://hkstudya.vercel.app/decks`. Embedded Clerk on `*.vercel.app` + `pk_test_` was unreliable. Clerk dashboard must allow `https://hkstudya.vercel.app` or you stay on “cannot redirect to your application”.

---

## Version 3.0.4 — 2026-08-31 — `f08e4ad`

**Miniscule.** `auth.protect()` uses absolute sign-in URL. Next.js 16 was 500ing `/decks` (`URL is malformed "/sign-in"`).

---

## Version 3.0.3 — 2026-08-31 — `6f5890a`

**Miniscule.** Do not swallow Clerk’s development handshake on public routes (empty sign-in widget / `dev-browser-missing`).

---

## Version 3.0.2 — 2026-08-29 — `da473e2`

**Miniscule.** Pin `signInUrl=/sign-in` and `allowedRedirectOrigins` including the Vercel origin (later superseded by Account Portal in 3.1.0).

---

## Version 3.0.1 — 2026-08-29 — `4da3c3b`

**Miniscule.** Signed-in users go to `/decks`. Clerk uses `redirect_url`, not `next`. `auth.protect()`.

---

## Version 3.0.0 — 2026-08-28 — `41f7570`

**Major.** Notebook **studio** is the core product: read a source once, then mind map / notes / exam. `/api/notebooks`, `/api/decks/[id]/artifacts`. Flashcards are not the Create generate tile.

---

## Version 2.9.1 — 2026-08-25 — `05e9ccb`

**Miniscule.** Share links used localhost when `NEXT_PUBLIC_APP_URL` was unset; use Vercel host. Quiz/win contrast.

---

## Version 2.9.0 — 2026-08-25 — `cdaf135`

**Minor.** Public matching: questions left, answers right; hit removes both. Twin lanterns stay local.

---

## Version 2.8.0 — 2026-08-25 — `72467d2`

**Minor.** New-account tutorial. Public matching vanishes on a hit. Typed answers: model yes/no. Play contrast.

---

## Version 2.7.1 — 2026-08-25 — `0c98876`

**Miniscule.** Vercel Play: plain matching + typing, not Twin lanterns or Ink well. Localhost keeps 15 rooms.

---

## Version 2.7.0 — 2026-08-25 — `16a673f`

**Minor.** All 15 Play rooms locally; Vercel ships two (`NEXT_PUBLIC_VERCEL_ENV`).

---

## Version 2.6.0 — 2026-08-25 — `07f10d6`

**Minor.** Play: matching + type-the-answer. Photo search from the **answer**. Old themed URLs redirect.

---

## Version 2.5.2 — 2026-08-25 — `06d8c79`

**Miniscule.** Exclude Android APK wrapper from Next typecheck (Vercel build break).

---

## Version 2.5.1 — 2026-08-25 — `de11450`

**Miniscule.** GitHub-verified author email so Vercel deploys.

---

## Version 2.5.0 — 2026-08-25 — `f4cf793`

**Minor.** Light school UI, study streaks. Typed grading: accent-only match is exact; short miss copy; close answers still AI.

---

## Version 2.4.0 — 2026-08-16 — `a60818e`

**Minor.** 15 HK Play stages. Generate **refills** short decks. Weekly energy copy. APK WebView → Vercel.

---

## Version 2.3.1 — 2026-08-15 — `709d5af`

**Miniscule.** Heavy URL pages: cap-and-extract HTML (not fail at 1.5MB). Retry no longer submits an empty disabled form.

---

## Version 2.3.0 — 2026-08-13 — `4ecfbca`

**Minor.** Due-today → play or quiz when empty. Speak on cards. Phone layouts. Matching quiz chrome. Play i18n.

---

## Version 2.2.0 — 2026-08-13 — `6d4056b`

**Minor.** Play countdown/clock/juice. Antes max 10/hour, server scores. Class homework lock + student runs.

---

## Version 2.1.0 — 2026-08-13 — `36b0ae5`

**Minor.** Play antes 20 energy; refund 50%+ (bonus 80% / perfect). Typed answers via OpenRouter. Share/embed free.

---

## Version 2.0.0 — 2026-08-13 — `32b479c`

**Major.** Clerk-only auth (no Better Auth on Vercel). Wordwall-style classroom games (match, maze, airplane, diagrams, …). Share/class assignment links. Encyclopedia expand.

---

## Version 1.2.0 — 2026-08-13 — `96ad8e9`

**Minor.** Product name **HK Study A**.

---

## Version 1.1.0 — 2026-08-13 — `963a8db` (git tag `v1.1`)

**Minor.** Hosted generate is OpenRouter-only (Ollama path removed).

---

## Version 1.0.1 — 2026-08-13 — `b22ecfe`

**Miniscule.** Vercel build: static `maxDuration`, valid `group-hover` CSS.

---

## Version 1.0.0 — 2026-08-13 — `c3429a9` (git tag `v1.0`)

**Major.** First product backup: encyclopedia images, quiz choices, legal pages, Vercel deploy.

---

## Version 0.3.0 — 2026-08-11 — `f35b06b`

**Minor.** MVP backup: community HK packs, topic generate, UI refresh, Ollama (later removed).

---

## Version 0.2.0 — 2026-08-10 — `ea08e36`

**Minor.** Cursor MVP workflow rules.

---

## Version 0.1.0 — 2026-08-10 — `650b5e7`

**Minor.** Create Next App scaffold.

---

## Other branches (not this Version x.y.z line)

| Date | Commit | Where | What |
| --- | --- | --- | --- |
| 2026-08-10 | `4a5452a` | early main | first commit |
| 2026-08-10 | `6a0d47d` | `archive/rico` | Supabase password auth |
| 2026-08-13 | `5eea483` | `origin/main` | Wikipedia, arcade, “by nx” |
| 2026-08-25 | `19d7f9c` | `origin/milton` | Study-only UI, header/energy timeouts |
| 2026-08-25 | `baf2f2f` | `archive/play-core-two` | Two Play games only |
