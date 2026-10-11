# KIS Creativity Space

Next.js site for the KIS school makerspace: the public **student print site** (3D prints, posters, stickers) plus the staff **admin**. Teacher-facing tools (bookings, training, projects, Wednesdays, inventory) live in the Flutter companion app, which shares [docs/DATA-CONTRACT.md](docs/DATA-CONTRACT.md) and the same Supabase database.

## Pages

| Route | Description |
|-------|-------------|
| `/` | **Student print site** landing (cross-stitch theme) |
| `/print` | Request a 3D print, poster or stickers — email only, no password |
| `/requests` | Track your jobs (RECEIVED → … → READY), cancel while RECEIVED |
| `/admin` | Staff: Space · Items & inventory · Projects · Wednesdays · **Print requests** |

## Setup

```bash
npm install
cp .env.example .env.local
# add Supabase URL + publishable key
npm run dev
```

Run all migrations in `supabase/migrations/` in the Supabase SQL editor (through **022** for student print requests — it also creates the `print-files` storage bucket).

### Admin access

1. Create a user in Supabase Auth (Authentication → Users)
2. Insert that user into `teachers`:

```sql
insert into public.teachers (id, email)
values ('<auth-user-uuid>', 'teacher@school.edu');
```

3. Open `/admin` and sign in with that email and password

## Env

See `.env.example` for Supabase variables.

## Student print site

- Students request 3D prints, vinyl posters and die-cut stickers at `/print`, identified by email only (`kis-student-email` session key). Files upload from the browser straight into the public-read `print-files` bucket; the `createPrintRequest` server action then checks the extension per kind (`.stl/.3mf/.obj` · `.pdf/.png/.jpg/.svg` · `.svg/.pdf/.png`), the 50 MB cap and inserts the row.
- Stage lists — 3D: RECEIVED → SLICING → PRINTING → READY · poster/sticker: RECEIVED → PRINTING → CUTTING → READY. `status` is the index into the kind's list.
- Status changes are admin-only (RLS requires a teacher session; web admin + Flutter admin). Students may cancel only while RECEIVED. There is no email: students check the tracker, which shows READY (with a collect notice) and polls while open.
- The student site is the whole public site. The black teacher header now appears only on `/admin`; the public chrome is Cormorant Garamond + Space Mono with the cross-stitch `×` motifs (see `src/components/students/Motif.tsx`).

## Design notes

- Background: white (`#ffffff`)
- Accent: `#c8102e` / black `#141414`
- Body `#3f3b33` · secondary `#6d6759` · faint `#98917f`
- Type: Space Grotesk + Space Mono
- Inventory uses `quantity_available` + `quantity_total`; serials in `equipment_units`
- Space bookings live in `space_bookings` (`pending → confirmed | declined | cancelled`); item reservations stay auto-approved
- Training sessions live in `training_sessions` (same lifecycle); space bookings + blocks constrain training (one-way — trainings do not block the space schedule)
- Admin block periods live in `space_blocks` (one-day or weekly); striped on `/schedule`, requests rejected server-side
- Push notifications (FCM) for space/training requests are not wired yet — confirm/decline syncs over Supabase realtime in the app
