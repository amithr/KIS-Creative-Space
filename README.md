# KIS Design Studio

Next.js site for the KIS Design Studio (the school makerspace): the public **student print site** (3D prints, posters, stickers) plus the staff **print-queue admin**. Teacher-facing tools (bookings, training, projects, Wednesdays, inventory) live only in the Flutter companion app, which shares [docs/DATA-CONTRACT.md](docs/DATA-CONTRACT.md) and the same Supabase database.

## Pages

| Route | Description |
|-------|-------------|
| `/` | **Student print site** landing (cross-stitch theme) |
| `/print` | Request a 3D print, poster or stickers — name only, no email, no password |
| `/board` | **ON THE PRINTERS** — public live board of every open job (plus READY ones for 3 days), names only, polls while open. This is how students follow their prints; `/requests` redirects here. |
| `/admin` | **Studio Admin** (same folk aesthetic): shared-password gate, print queue with stage controls and downloads, filament colours on offer. `/studio` redirects here. |

## Setup

```bash
npm install
cp .env.example .env.local
# add Supabase URL + publishable key
npm run dev
```

Run all migrations in `supabase/migrations/` in the Supabase SQL editor (through **025**: `022` creates `print_requests` and the `print-files` storage bucket, `023` adds `filament_colors`, `024` drops the old points columns and the email column, `025` drops the anonymous cancel policy, `026` adds `status_at`, stamped by trigger on every stage change).

### Admin access

Set `STUDIO_ADMIN_PW` (the shared staff password) and `SUPABASE_SECRET_KEY` in `.env.local`, then open `/admin`. There is no per-teacher login on the web any more; the `teachers` table and Supabase Auth are used only by the Flutter app.

## Env

See `.env.example`.

## Student print site

- Students request 3D prints, vinyl posters and die-cut stickers at `/print`, identified by **name only** — no email, no login (`kis-student-name` session key prefills the form for a second request). Files upload from the browser straight into the public-read `print-files` bucket; the `createPrintRequest` server action then checks the extension per kind (`.stl/.3mf/.obj` · `.pdf/.png/.jpg/.svg` · `.svg/.pdf/.png`) and the 50 MB cap, and inserts the row.
- There is no per-student tracker or cancel: students follow their job on the public **ON THE PRINTERS** board (`/board`), where it appears under first name + last initial the moment it is sent. Changing or withdrawing a request is done by asking the Design Studio, which removes it from Studio Admin.
- There is no points system: no balances, origins, quality ratings, top-ups, ranks, rushnyk or leaderboard. Every print is simply queued and tracked.
- Stage lists — 3D: RECEIVED → SLICING → PRINTING → READY · poster/sticker: RECEIVED → PRINTING → CUTTING → READY. `status` is the index into the kind's list.
- **Studio Admin** at `/admin`: `STUDIO_ADMIN_PW` gates it (HMAC cookie, 12 h); mutations (stage, remove/restore, colours) run through the service-role client, so `SUPABASE_SECRET_KEY` must be set. Students have no mutations at all. The Flutter admin uses its teacher session instead (RLS).
- **3D preview in the browser.** Every 3D job with a file has a `+ VIEW` button in Studio Admin, and a `+ VIEW 3D` chip on ON THE PRINTERS, that slides open a three.js viewer (`src/components/students/ModelViewer.tsx`, disclosure in `Reveal.tsx`): the `.stl` / `.3mf` / `.obj` is fetched straight from the public bucket, centred, stood Z-up, coloured with the job's filament and left slowly orbiting until dragged. The footer shows the bounding box in mm and turns red past 18 cm. three.js is imported on first open only, and closing the panel disposes the WebGL context. On the public board the whole row is the tap target, only one preview is open at a time, and the row scrolls into view once the panel has grown. Note this means any visitor can look at any upload while the job is open — the bucket was already public-read, the board just makes it visible.
- **Uploads live only as long as the job.** The Studio Admin shows a `↓ DOWNLOAD` link on every job that still has a file (public-read bucket URL with `?download=`, so the slicer gets the original filename). Marking a print READY deletes the upload and clears `file_path` once the UNDO window (about 5 s) has passed; removing a request does the same for its orphaned file. Opening `/admin` also sweeps any print that has been READY for over two minutes with a file still attached (`src/lib/print-files.ts`), which covers READY marks made from the Flutter app. The Flutter Prints tab mirrors this: `↓ COPY FILE LINK` on the card, deletion after its undo snackbar.
- **ON THE PRINTERS** (`/board`, fourth nav tab with the blinking dot, also linked from the hero's mono live line): every request with `status < 3` plus READY ones for three days after `ready_at`, grouped READY TO COLLECT · ON THE MACHINES · BEING PREPARED · IN THE QUEUE and shown as first name + last initial only (`src/lib/board.ts`). Each row carries the stitched thread tracker with the bobbing needle over the current stage, and its "N min ago" counts from the last stage change (`status_at`), or from submission while still RECEIVED; the client polls every 12 s while the tab is visible.
- No email is collected or sent: students check ON THE PRINTERS, which shows READY TO COLLECT for three days and polls while open.
- The site is bilingual: an EN / УКР switch in the nav (remembered in `localStorage`, defaults to Ukrainian for `uk` browsers). All student copy lives in `src/lib/i18n.ts`; the Studio Admin stays English. The type is **Archivo** on its `wdth` axis at `font-stretch: 75%` (semi-condensed) plus **Space Mono** for labels; neither has Cyrillic, so Fira Sans Condensed and IBM Plex Mono are loaded as per-glyph fallbacks for the Ukrainian copy.
- Easter egg: typing `stitch` anywhere outside a text field (or clicking the faint `· ×` at the end of the footer) opens **Stitch Run**, a canvas runner drawn entirely with `×` glyphs (`src/components/students/StitchRun.tsx`). Space / ↑ / tap jumps, ↓ ducks, Esc closes; the best score is kept in `localStorage` (`kis-stitch-run-hi`).
- The student site is the whole public site, and the Studio Admin is the whole admin: the former teacher dashboard (bookings, blocks, inventory, projects, Wednesdays, QR labels) was removed from the web along with its Supabase-Auth login. The chrome everywhere is Archivo (wdth 75) + Space Mono with the cross-stitch `×` motifs (see `src/components/students/Motif.tsx`).
- **Brand.** The product is **KIS Design Studio**; the hero motto is "Turn your ideas into something real." The logo is a stitched **D** built from the same `×` glyph grid as every motif (`BrandMark` in `Motif.tsx`, 42 px in both navs, one red stitch at the centre of the counter; `tone` picks ink-on-cream, cream-on-ink or cream-on-red). Static SVGs for email, social and print are in `public/brand/` (`kis-design-studio-mark-{ink,cream,on-red}.svg`, `kis-design-studio-lockup.svg`); `src/app/icon.svg`, `favicon.ico` and `apple-icon.png` are the on-red tile. Keep one cell (⅐ of the mark) of clear space, never stretch or recolour it outside those three palettes, and never set it on a gradient.
