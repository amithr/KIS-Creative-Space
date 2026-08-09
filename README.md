# KIS Creativity Space

Next.js site for the KIS school makerspace, matching design handoff v5 (Resources, Schedule, Admin) and the shared [docs/DATA-CONTRACT.md](docs/DATA-CONTRACT.md) with the Flutter companion app.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Resources — live inventory, date/period reservations, OUT bands |
| `/schedule` | Request room periods (P1–P8); pending until admin confirms |
| `/admin` | Tabs: Space bookings (requests + blocks) · Items & inventory (loans, check-out/in, QR, stock) |
| `/equipment/[qrCode]` | QR landing page |

## Setup

```bash
npm install
cp .env.example .env.local
# add Supabase URL + publishable key
npm run dev
```

Run all migrations in `supabase/migrations/` (**001–009**) in the Supabase SQL editor.

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

## Design notes

- Background: white (`#ffffff`)
- Accent: `#c8102e` / black `#141414`
- Body `#3f3b33` · secondary `#6d6759` · faint `#98917f`
- Type: Space Grotesk + Space Mono
- Inventory uses `quantity_available` + `quantity_total`; serials in `equipment_units`
- Space bookings live in `space_bookings` (`pending → confirmed | declined | cancelled`); item reservations stay auto-approved
- Training sessions live in `training_sessions` (same lifecycle); Schedule and Training share one availability rule (blocks, space bookings, and training sessions all occupy periods on both grids)
- Admin block periods live in `space_blocks` (one-day or weekly); striped on `/schedule`, requests rejected server-side
- Push notifications (FCM) for space/training requests are not wired yet — confirm/decline syncs over Supabase realtime in the app
