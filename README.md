# HK Study A — AI Flashcard Generator

Turn notes, PDFs, and photos into interactive flashcards. Built with **Next.js 16**, **Clerk**, **Supabase** (Postgres + Storage), and **OpenRouter** LLM generation.

## Features

- Auth via **Clerk** (email sign-in and other methods you enable in the Clerk dashboard)
- Create decks from pasted text, URL/YouTube, PDF, TXT/Markdown, or JPG/PNG
- **Sample deck** for testing study/share without an LLM key
- AI generation via **OpenRouter** (DeepSeek, Qwen, and other catalog models)
- Collectible-style flip cards with Hard / OK / Easy ratings
- Shuffle, restart, and saved study progress
- **Play:** matching pairs and type-the-answer on the same cards
- Weekly **energy** for generation and play (not money; see Energy below)
- Read-only share and embed links (anonymous study/play; signed-in users can save study progress)
- Class links copy a deck into a learner library and can lock one activity

## Setup

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment**

```bash
cp .env.example .env.local
```

### Required for core app (auth + sample decks)

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | Local: `http://localhost:3000` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `ADMIN_BOOTSTRAP_EMAIL` | Optional: this Clerk email is treated as admin |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API Keys → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Settings → API Keys → **Publishable** (`sb_publishable_…`) |
| `DATABASE_URL` | Connect → Transaction pooler (port 6543). URL-encode special password characters (e.g. `*` → `%2A`) |

Sign-in is **Clerk only**. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the [Clerk dashboard](https://dashboard.clerk.com). Enable email sign-in (and Google or others if you want) in Clerk. To open `/admin`, sign in with `ADMIN_BOOTSTRAP_EMAIL` or set that user’s `publicMetadata.role` to `"admin"` in Clerk.

Community seeds stay under `system:study-a-community`.

### Required for full AI features

| Need | Variable | Source |
|------|----------|--------|
| AI generation + typed play grading | `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai) |
| File/photo uploads | `SUPABASE_SECRET_KEY` | Settings → API Keys → **Secret** (`sb_secret_…`, server only) |

### Legal pages & languages

- Public routes: `/privacy`, `/terms`, `/cookies` (English is the official legal text; set contact/operator via `NEXT_PUBLIC_LEGAL_*` or `lib/legal.ts`)
- UI languages: English, 繁體中文, 简体中文, 日本語, 한국어, Español, Français (header switcher; cookie `NEXT_LOCALE`)
- Card generation language is a dropdown of the same list (not free text)

### Admin access

1. Set `ADMIN_BOOTSTRAP_EMAIL` to your Clerk account email (optional).
2. Run `npm run db:migrate`.
3. Sign in at `/sign-in` with that email, then open `/admin` to set weekly energy.

### Energy

Weekly energy (default 600) is an in-app text-generation and play allowance, not money, and not cash-out.

- **Generate** spends energy from the token estimate on the create-deck screen.
- **Play** on a deck you own costs **20 energy** to start a round. Score **50%+** to get 20 back; **80%+** pays 30; a **perfect** run pays 40. Below 50%, or if you quit before the finish screen, the ante stays spent. At most **10** paid rounds per hour.
- **Share** and **embed** play is free (read-only). Visitors are not charged.
- **Class links** copy the deck into the learner’s library; play on that copy uses the learner’s energy. Teachers can lock one activity, limit to due-today cards, and read scores at `/decks/[id]/class`.
- **Type the answer** first checks an exact match, then grades synonyms with the OpenRouter catalog model. That check does not spend extra energy, but it needs `OPENROUTER_API_KEY`.

Optional: set `LLM_DEFAULT_PROVIDER=openrouter` (legacy `openai` / `anthropic` / `google` / `ollama` values also map to OpenRouter). Enable the **Supabase Cursor plugin** for agent access to your project (no extra env vars needed).

Source uploads are deleted after successful generation when you pick “clear immediately”.

After migrations, seed the community library:

```bash
npm run db:migrate
npm run db:seed-community
```

### Security / rotation

- Never commit `.env.local` or `SUPABASE_SECRET_KEY` (gitignored).
- If any credential appeared in chat or logs, rotate: `CLERK_SECRET_KEY`, database password, secret API key, LLM keys, and MCP access token.
- Use [publishable + secret API keys](https://supabase.com/docs/guides/getting-started/api-keys) only.

3. **Run migrations**

```bash
npm run db:migrate
```

The private `flashcard-media` storage bucket is created automatically on first upload when `SUPABASE_SECRET_KEY` is set.

4. **Start the app**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Agents:** keep this server on. If port 3000 is empty, run `npm run dev` again — do not wait to be asked. Do not switch ports (Clerk allowlist is `localhost:3000`).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build & serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit + integration tests (Vitest) |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run db:migrate` | App schema migrations |

Set `E2E_LLM=true` to run the optional paid LLM generation E2E flow.

## Deploy

### Vercel

1. Push the repo and [import it in Vercel](https://vercel.com/new). Framework preset is Next.js (`vercel.json`). The Hong Kong region (`hkg1`) matches the app’s governing law; change `regions` in `vercel.json` if your Supabase project is far away.
2. Set **Production** env vars (same names as `.env.example`). Use HTTPS URLs:

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` (or `https://your-app.vercel.app`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `DATABASE_URL` | Supabase **Transaction pooler** (port **6543**) + `?pgbouncer=true` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | Secret key (uploads) |
| `OPENROUTER_API_KEY` | Required for generation and Play typed-answer grading |
| `NEXT_PUBLIC_LEGAL_EMAIL` | Real inbox for `/privacy` contact |
| `NEXT_PUBLIC_LEGAL_OPERATOR` | Your name or organisation |
| `ADMIN_BOOTSTRAP_EMAIL` | Clerk email treated as admin |

3. Do **not** run `db:migrate` as the Vercel build command. From your laptop, point `DATABASE_URL` at production and run:

```bash
npm run db:migrate
npm run db:seed-community
```

4. Deploy. Open `/privacy`, `/terms`, and `/cookies`, then sign in at `/sign-in`.

**Limits:** Vercel Hobby caps serverless functions at 60s, so large/scanned PDFs may time out. Pro can raise `maxDuration` toward 300s.

### Generic Node host

1. Set all production env vars (use HTTPS for `NEXT_PUBLIC_APP_URL`).
2. Run `db:migrate` against production Postgres.
3. `npm run build` && `npm start`.

### Android debug APK (sideload)

The Next.js website stays at the repo root. The APK in `apk/` is only a WebView shell that loads [https://hkstudya.vercel.app](https://hkstudya.vercel.app).

**App updates:** push the website to Vercel. Every installed APK picks up the new UI on the next launch — users do not download a new APK. Rebuild the APK only when native shell code changes (icons, permissions, package id, Capacitor config).

1. Install [Android Studio](https://developer.android.com/studio) (SDK plus a **JDK 21**). Gradle 8.11 cannot run on Android Studio’s bundled JDK 25. In Studio: **Settings → Build → Gradle → Gradle JDK → 21**.
2. From the repo:

```bash
cd apk
npm install
npx cap sync android
```

3. Build a debug APK, either:

```bash
npx cap open android
```

then **Build → Build APK(s)** in Android Studio, or:

```bash
cd apk
npm run debug
```

Output: `HK-Study-A-debug.apk` at the repo root.

4. Copy the APK to a phone, enable **Install unknown apps**, and open it.

To point the wrapper at a different host: `CAPACITOR_SERVER_URL=https://example.com npx cap sync android` from `apk/`.
