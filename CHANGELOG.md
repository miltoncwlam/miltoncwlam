# Changelog

**Version 3.2.5** — one number only (`package.json`).

Git has 39 commits (29 on `milton`). Chat turns are not versions.

## Remotes

| Remote | GitHub | Role |
| --- | --- | --- |
| `origin` | [aailckw/interns-ai-flashcard](https://github.com/aailckw/interns-ai-flashcard) | `milton` is study-only `19d7f9c`. Do not force-push. |
| `miltoncwlam` | [miltoncwlam/miltoncwlam](https://github.com/miltoncwlam/miltoncwlam) | **`ai-flashcard`** → [hkstudya.vercel.app](https://hkstudya.vercel.app) |

```bash
git checkout v1.0    # Version 1.0.0
git checkout v1.1    # Version 1.1.0
git checkout archive/study-only-production
git checkout archive/play-core-two
git checkout archive/milton-2026-09-06
```

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
