# HK Study A — AI Flashcard Generator

Turn notes, PDFs, and photos into interactive flashcards. Built with **Next.js 16**, **Better Auth**, **Supabase** (Postgres + Storage), and **OpenRouter** LLM generation.

## Features

- Auth via **Better Auth** (email/password + passkeys) **and optional Clerk** (social / hosted sign-in)
- Create decks from pasted text, URL/YouTube, PDF, TXT/Markdown, or JPG/PNG
- **Sample deck** for testing study/share without an LLM key
- AI generation via **OpenRouter** (DeepSeek, Qwen, and other catalog models)
- Collectible-style flip cards with Hard / OK / Easy ratings
- Shuffle, restart, and saved study progress
- Read-only share links (anonymous study; signed-in users can save progress)

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
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (min 32 chars) |
| `BETTER_AUTH_URL` | Same as app URL (`http://localhost:3000`) |
| `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` | First admin (created by `npm run db:migrate`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API Keys → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Settings → API Keys → **Publishable** (`sb_publishable_…`) |
| `DATABASE_URL` | Connect → Transaction pooler (port 6543). URL-encode special password characters (e.g. `*` → `%2A`) |

Auth supports **both Better Auth and Clerk** on the same app:

- **Better Auth** — email/password, passkeys, admin provisioning (`/admin`), energy controls
- **Clerk** (optional) — paste `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` from [Clerk dashboard](https://dashboard.clerk.com) into `.env.local` for social sign-in on `/sign-in` and `/sign-up`

Legacy Clerk `user_…` deck rows still work. Better Auth users get separate IDs unless you sign in with the same email via both (separate accounts). Community seeds stay under `system:study-a-community`.

### Required for full AI features

| Need | Variable | Source |
|------|----------|--------|
| AI generation | `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai) |
| File/photo uploads | `SUPABASE_SECRET_KEY` | Settings → API Keys → **Secret** (`sb_secret_…`, server only) |

### Legal pages & languages

- Public routes: `/privacy`, `/terms`, `/cookies` (English is the official legal text; set contact/operator via `NEXT_PUBLIC_LEGAL_*` or `lib/legal.ts`)
- UI languages: English, 繁體中文, 简体中文, 日本語, 한국어, Español, Français (header switcher; cookie `NEXT_LOCALE`)
- Card generation language is a dropdown of the same list (not free text)

### Better Auth admin bootstrap

1. Set `BETTER_AUTH_SECRET`, `ADMIN_BOOTSTRAP_EMAIL`, and `ADMIN_BOOTSTRAP_PASSWORD` in `.env.local`.
2. Run `npm run db:migrate` (applies SQL + bootstraps the admin with unlimited energy).
3. Sign in at `/sign-in`, then open `/admin` to create learners and set weekly energy / unlimited.
4. Optional: add a passkey from the admin page after sign-in.

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
| `BETTER_AUTH_URL` | **Same** HTTPS origin (passkeys break if this stays `localhost`) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `DATABASE_URL` | Supabase **Transaction pooler** (port **6543**) + `?pgbouncer=true` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | Secret key (uploads) |
| `OPENROUTER_API_KEY` | Required for generation on Vercel |
| `NEXT_PUBLIC_LEGAL_EMAIL` | Real inbox for `/privacy` contact |
| `NEXT_PUBLIC_LEGAL_OPERATOR` | Your name or organisation |
| `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` | First admin (run migrate **once** against prod) |

3. Do **not** run `db:migrate` as the Vercel build command. From your laptop, point `DATABASE_URL` at production and run:

```bash
npm run db:migrate
npm run db:seed-community
```

4. Deploy. Open `/privacy`, `/terms`, and `/cookies`, then sign in at `/sign-in`.

**Limits:** Vercel Hobby caps serverless functions at 60s, so large/scanned PDFs may time out. Pro can raise `maxDuration` toward 300s.

### Generic Node host

1. Set all production env vars (use HTTPS for `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL`).
2. Run `db:migrate` against production Postgres.
3. `npm run build` && `npm start`.
