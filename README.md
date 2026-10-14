# KIS Design Studio

Next.js site for the KIS Design Studio (the school makerspace): the public **student print site** (3D prints, posters, stickers) plus the staff **print-queue admin**. Teacher-facing tools (bookings, training, projects, Wednesdays, inventory) live only in the Flutter companion app, which shares [docs/DATA-CONTRACT.md](docs/DATA-CONTRACT.md) and the same Supabase database.

## Pages

| Route | Description |
|-------|-------------|
| `/` | **Student print site** landing (cross-stitch theme) |
| `/print` | Request a 3D print, poster or stickers — email only, no password |
| `/requests` | Track your jobs (RECEIVED → … → READY), cancel while RECEIVED |
| `/board` | **ON THE PRINTERS** — public live board of every open job (plus READY ones for 3 days), names only, polls while open |
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
- **Uploads live only as long as the job.** The Studio Admin shows a `↓ DOWNLOAD` link on every job that still has a file (public-read bucket URL with `?download=`, so the slicer gets the original filename). Marking a print READY deletes the upload and clears `file_path` once the UNDO window (about 5 s) has passed; removing a request does the same for its orphaned file; a student cancelling at RECEIVED deletes theirs immediately. Opening `/admin` also sweeps any print that has been READY for over two minutes with a file still attached (`src/lib/print-files.ts`), which covers READY marks made from the Flutter app. The Flutter Prints tab mirrors this: `↓ COPY FILE LINK` on the card, deletion after its undo snackbar.
- **ON THE PRINTERS** (`/board`, fourth nav tab with the blinking dot, also linked from the hero's mono live line): every request with `status < 3` plus READY ones for three days after `ready_at`, grouped READY TO COLLECT · ON THE MACHINES · BEING PREPARED · IN THE QUEUE and shown as first name + last initial only — the `listLiveBoard` action strips emails before anything reaches the browser (`src/lib/board.ts`). Each row carries the stitched thread tracker with the bobbing needle over the current stage; the client polls every 12 s while the tab is visible.
- No email is sent: students check the tracker, which shows READY with a collect notice and polls while open. The school-project teacher notification is a logging hook in `src/app/actions/prints.ts` (`notifyTeacherOfSchoolPrint`) — plug a webhook in there if wanted.
- The landing leaderboard is built but hidden: `NEXT_PUBLIC_SHOW_LEADERBOARD=1` shows it once ≥ 3 students have earned stitches.
- The site is bilingual: an EN / УКР switch in the nav (remembered in `localStorage`, defaults to Ukrainian for `uk` browsers). All student copy lives in `src/lib/i18n.ts`; the Studio Admin stays English. The type is **Archivo** on its `wdth` axis at `font-stretch: 75%` (semi-condensed) plus **Space Mono** for labels; neither has Cyrillic, so Fira Sans Condensed and IBM Plex Mono are loaded as per-glyph fallbacks for the Ukrainian copy.
- Easter egg: typing `stitch` anywhere outside a text field (or clicking the faint `· ×` at the end of the footer) opens **Stitch Run**, a canvas runner drawn entirely with `×` glyphs (`src/components/students/StitchRun.tsx`). Space / ↑ / tap jumps, ↓ ducks, Esc closes; the best score is kept in `localStorage` (`kis-stitch-run-hi`).
- The student site is the whole public site, and the Studio Admin is the whole admin: the former teacher dashboard (bookings, blocks, inventory, projects, Wednesdays, QR labels) was removed from the web along with its Supabase-Auth login. The chrome everywhere is Archivo (wdth 75) + Space Mono with the cross-stitch `×` motifs (see `src/components/students/Motif.tsx`).
- **Brand.** The product is **KIS Design Studio**; the hero motto is "Turn your ideas into something real." The logo is a stitched **D** built from the same `×` glyph grid as every motif (`BrandMark` in `Motif.tsx`, 42 px in both navs, one red stitch at the centre of the counter; `tone` picks ink-on-cream, cream-on-ink or cream-on-red). Static SVGs for email, social and print are in `public/brand/` (`kis-design-studio-mark-{ink,cream,on-red}.svg`, `kis-design-studio-lockup.svg`); `src/app/icon.svg`, `favicon.ico` and `apple-icon.png` are the on-red tile. Keep one cell (⅐ of the mark) of clear space, never stretch or recolour it outside those three palettes, and never set it on a gradient.
