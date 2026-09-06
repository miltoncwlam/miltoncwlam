# HK Study A — version logsheet

Recorded 6 Sep 2026 from local git plus both GitHub remotes.  
Check out any row with `git checkout <tag-or-branch>`.

## Remotes

| Remote | GitHub | Role |
| --- | --- | --- |
| `origin` | [aailckw/interns-ai-flashcard](https://github.com/aailckw/interns-ai-flashcard) | Shared repo. Branch `milton` was left on the **study-only** snapshot (diverged; not force-pushed). |
| `miltoncwlam` | [miltoncwlam/miltoncwlam](https://github.com/miltoncwlam/miltoncwlam) | Vercel production. Branch **`ai-flashcard`** → [hkstudya.vercel.app](https://hkstudya.vercel.app). |

## Named snapshots

| Version | Date | Git | What it is |
| --- | --- | --- | --- |
| Scaffold | 10 Aug 2026 | `650b5e7` | Create Next App |
| Rules / first project | 10 Aug 2026 | `ea08e36` (`main`) | Cursor MVP rules |
| Rico auth | 10 Aug 2026 | `6a0d47d` `archive/rico` | Supabase username/password experiment |
| MVP backup | 11 Aug 2026 | `f35b06b` | Community HK packs, topic generate, UI refresh |
| **v1.0** | 13 Aug 2026 | tag `v1.0` (`c3429a9`) | Encyclopedia images, quiz choices, legal pages, Vercel |
| Origin `main` line | 13 Aug 2026 | `origin/main` (`5eea483`) | Wikipedia library, arcade, “by nx” branding (forked after v1.0) |
| **v1.1** | 13 Aug 2026 | tag `v1.1` (`963a8db`) | OpenRouter-only generate (Ollama path removed) |
| HK Study A rename | 13 Aug 2026 | `96ad8e9` | Product name |
| Play + energy | 13–16 Aug 2026 | `32b479c` … `a60818e` | Wordwall/HK Play rooms, energy, Android wrapper |
| Study-only production | 23–25 Aug 2026 | `archive/study-only-production` (`19d7f9c`) = **`origin/milton`** | School UI, study only (no 15 Play rooms on that line) |
| Play-core two | 25 Aug 2026 | `archive/play-core-two` (`baf2f2f`) | Matching + type-the-answer only |
| Local 15 / Vercel 2 | 25 Aug 2026 | `16a673f` | Twin lanterns local; two games on Vercel |
| Notebook studio | 28 Aug 2026 | `41f7570` | Source → mind map / notes / exam |
| Clerk on Vercel | 29–31 Aug 2026 | `549bce7` `miltoncwlam/ai-flashcard` | Account Portal sign-in, handshake, absolute redirects |

## GitHub branch map (after this archive push)

| Branch / tag | Remote | Tip |
| --- | --- | --- |
| `v1.0` | origin + miltoncwlam | `c3429a9` |
| `v1.1` | origin + miltoncwlam | `963a8db` |
| `main` | origin | `5eea483` |
| `milton` | origin | `19d7f9c` (study-only; **do not force-push**) |
| `ai-flashcard` | miltoncwlam | current studio + Clerk (live Vercel) |
| `archive/rico` | both | `6a0d47d` |
| `archive/v1.0` | both | `c3429a9` |
| `archive/v1.1` | both | `963a8db` |
| `archive/study-only-production` | both | `19d7f9c` |
| `archive/play-core-two` | both | `baf2f2f` |
| `archive/milton-2026-09-06` | both | this logsheet + Clerk portal line |

## Full `milton` line (oldest → newest)

| Date | Commit | Message |
| --- | --- | --- |
| 2026-08-10 | `ea08e36` | Add Cursor rules for MVP development workflow |
| 2026-08-11 | `f35b06b` | Backup Study A MVP |
| 2026-08-13 | `c3429a9` | **v1.0** backup |
| 2026-08-13 | `b22ecfe` | Fix Vercel production build |
| 2026-08-13 | `963a8db` | **v1.1** OpenRouter-only |
| 2026-08-13 | `96ad8e9` | Rename to HK Study A |
| 2026-08-13 | `32b479c` | Wordwall games + encyclopedia |
| 2026-08-13 | `36b0ae5` | Energy to play, pay back on a win |
| 2026-08-13 | `6d4056b` | Play juice, teacher class scores |
| 2026-08-13 | `4ecfbca` | Due-today, matching quiz, play i18n |
| 2026-08-15 | `709d5af` | URL generate on heavy pages + Retry |
| 2026-08-16 | `a60818e` | 15 HK Play stages + Android wrapper |
| 2026-08-25 | `f4cf793` | Light school UI, streaks, typed grading |
| 2026-08-25 | `de11450` | GitHub-verified author for Vercel |
| 2026-08-25 | `06d8c79` | APK wrapper out of Next typecheck |
| 2026-08-25 | `07f10d6` | Play: matching + type-the-answer + photos |
| 2026-08-25 | `16a673f` | 15 rooms local, two on Vercel |
| 2026-08-25 | `0c98876` | Plain flip cards / typing on Vercel |
| 2026-08-25 | `72467d2` | New-account tutorial |
| 2026-08-25 | `cdaf135` | Two-column Vercel matching |
| 2026-08-25 | `05e9ccb` | Share links + generate/finish UI |
| 2026-08-28 | `41f7570` | Notebook studio |
| 2026-08-29 | `4da3c3b` | Signed-in users → `/decks` |
| 2026-08-29 | `da473e2` | Keep sign-in on `/sign-in` |
| 2026-08-31 | `6f5890a` | Clerk handshake on Vercel |
| 2026-08-31 | `f08e4ad` | Absolute sign-in URL (no middleware 500) |
| 2026-08-31 | `549bce7` | Clerk Account Portal → `/decks` |

## Alternate line (study-only, on `origin/milton`)

These three commits are **not** ancestors of current `milton`; they branched after the 15-Play ship.

| Date | Commit | Message |
| --- | --- | --- |
| 2026-08-23 | `2e846d4` | Publish study-only production app |
| 2026-08-23 | `83958d3` | Refine school-themed production UI |
| 2026-08-25 | `19d7f9c` | Header during theme init + energy timeouts |

## Restore examples

```bash
git fetch origin
git fetch miltoncwlam
git checkout v1.0
git checkout v1.1
git checkout archive/study-only-production
git checkout archive/play-core-two
git checkout archive/milton-2026-09-06
```

Live site tracks `miltoncwlam/ai-flashcard`, not `origin/milton`.
