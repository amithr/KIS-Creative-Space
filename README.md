# KIS Creativity Space

Next.js site for the KIS school makerspace: the public **student print site** (3D prints, posters, stickers) plus the staff **print-queue admin**. Teacher-facing tools (bookings, training, projects, Wednesdays, inventory) live only in the Flutter companion app, which shares [docs/DATA-CONTRACT.md](docs/DATA-CONTRACT.md) and the same Supabase database.

## Pages

| Route | Description |
|-------|-------------|
| `/` | **Student print site** landing (cross-stitch theme) |
| `/print` | Request a 3D print, poster or stickers — email only, no password |
| `/requests` | Track your jobs (RECEIVED → … → READY), cancel while RECEIVED |
| `/admin` | **Studio Admin** (same folk aesthetic): shared-password gate, print queue, origin / quality / stage / top-up controls, filament colours on offer. `/studio` redirects here. |

## Setup

```bash
npm install
cp .env.example .env.local
# add Supabase URL + publishable key
npm run dev
```

Run all migrations in `supabase/migrations/` in the Supabase SQL editor (through **023**: `022` creates `print_requests` and the `print-files` storage bucket, `023` adds the points economy columns and `filament_colors`).

### Admin access

Set `STUDIO_ADMIN_PW` (the shared staff password) and `SUPABASE_SECRET_KEY` in `.env.local`, then open `/admin`. There is no per-teacher login on the web any more; the `teachers` table and Supabase Auth are used only by the Flutter app.

## Env

See `.env.example`.

## Student print site

- Students request 3D prints, vinyl posters and die-cut stickers at `/print`, identified by email only (`kis-student-email` session key). Files upload from the browser straight into the public-read `print-files` bucket; the `createPrintRequest` server action then checks the extension per kind (`.stl/.3mf/.obj` · `.pdf/.png/.jpg/.svg` · `.svg/.pdf/.png`), the 50 MB cap, the balance, and inserts the row.
- Stage lists — 3D: RECEIVED → SLICING → PRINTING → READY · poster/sticker: RECEIVED → PRINTING → CUTTING → READY. `status` is the index into the kind's list.
- **Points economy** lives in one module, `src/lib/ledger.ts`, used by the form, the tracker, the Studio Admin and the server actions (mirrored in the Flutter app's `lib/data/ledger.dart`): start 30, each print costs 10, school-project prints are free (and need a teacher from `src/lib/teachers.ts`), own designs earn 15 + quality bonus (20 / 25 / 30) when READY, found files earn 0. `balance = 30 − 10 × non-free prints + Σ earn(READY) + Σ adjust`; `stitches = Σ earn(READY)` drives the rank (Thread 0 · Needle 15 · Stitcher 40 · Weaver 80 · Master Embroiderer 150) and the rushnyk bands on `/requests`. Level-ups fire the next time the student opens the tracker (`kis-last-rank:<email>` in `localStorage`).
- **Studio Admin** at `/admin`: `STUDIO_ADMIN_PW` gates it (HMAC cookie, 12 h); mutations (stage, origin, quality, +10 top-up, remove/restore, colours) run through the service-role client, so `SUPABASE_SECRET_KEY` must be set. Students may cancel only while RECEIVED. The Flutter admin uses its teacher session instead (RLS).
- No email is sent: students check the tracker, which shows READY with a collect notice and polls while open. The school-project teacher notification is a logging hook in `src/app/actions/prints.ts` (`notifyTeacherOfSchoolPrint`) — plug a webhook in there if wanted.
- The landing leaderboard is built but hidden: `NEXT_PUBLIC_SHOW_LEADERBOARD=1` shows it once ≥ 3 students have earned stitches.
- The site is bilingual: an EN / УКР switch in the nav (remembered in `localStorage`, defaults to Ukrainian for `uk` browsers). All student copy lives in `src/lib/i18n.ts`; the Studio Admin stays English. Space Mono has no Cyrillic, so IBM Plex Mono is loaded as the per-glyph fallback.
- The student site is the whole public site, and the Studio Admin is the whole admin: the former teacher dashboard (bookings, blocks, inventory, projects, Wednesdays, QR labels) was removed from the web along with its Supabase-Auth login. The chrome everywhere is Cormorant Garamond + Space Mono with the cross-stitch `×` motifs (see `src/components/students/Motif.tsx`).
