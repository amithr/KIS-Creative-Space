# KIS Creativity Space

Next.js site for the KIS school makerspace, matching design handoff v3 (Resources, Schedule, About, Admin).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Resources — live inventory, filters, inline reserve |
| `/schedule` | Room booking by class period (P1–P8), one week ahead |
| `/about` | About the space |
| `/admin` | Teacher inventory management |
| `/equipment/[qrCode]` | QR landing page |

## Setup

```bash
npm install
cp .env.example .env.local
# add Supabase URL + publishable key
npm run dev
```

Run all migrations in `supabase/migrations/` (001–005) in the Supabase SQL editor.

### Teacher account

1. Create a user in Supabase Auth
2. Insert into `teachers`:

```sql
insert into public.teachers (id, email)
values ('<auth-user-uuid>', 'teacher@school.edu');
```

## Env

See `.env.example` for Supabase and Telegram channel variables.

## Design notes

- Background: white (`#ffffff`)
- Accent: `#c8102e` / black `#141414`
- Body `#3f3b33` · secondary `#6d6759` · faint `#98917f`
- Type: Manrope + IBM Plex Mono
- Inventory uses `quantity_available` + `quantity_total`; serials in `equipment_units`
- Period bookings live in `period_bookings`
