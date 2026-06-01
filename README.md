# Smart Thikana — Bangladesh House Rental Platform

A trust-first house-rental web app tailored for Bangladesh. Tenants discover
verified properties using the official **Division → District → Thana** address
hierarchy; landlords register properties against City Corporation tax keys
(holding number, ward, zone); both sides build reputation through peer
feedback and an automatically-generated rental history.

> **Stack** — React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui ·
> **Backend** —Cusotm Tax Algorithm(Slab350X) || MinAdv-109V(Section-109-Gov)  Supabase (managed Postgres + Auth + Storage + Realtime)

---

## 1. Features

### Shared

- Email + password and Google sign-in (managed OAuth — no client setup needed)
- Role-based onboarding (Tenant / Landlord) with a separate `user_roles` table
- Editable profile (name, phone, avatar, bio, copyable User ID)
- KYC verification (NID front/back + selfie) stored in a private storage bucket
- Realtime 1-to-1 chat between tenant and landlord per listing
- Browser + in-app message notifications (single subscription, no duplicates)
- Tenant ↔ Landlord peer feedback (peer-only visibility via RLS)
- Printable receipts with structured BD address and Google Maps link
- Tanant rental history visible to landlords for trust; landlord lookup by tenant User ID
- Mobile hamburger nav + responsive layouts
- Digital deal flow: propose → accept / reject → pay → branded receipt
- Monthy billing cycle with auto-generated rental history (visible to landlords for trust)
- Printable receipts with structured BD address and Google Maps link
- Mobile hamburger nav + responsive layouts

### Tenant

- Browse all active listings; filter by type, price, search text
- **"Near me"** mode — listings sorted by Haversine distance from GPS
- **"By location"** mode — Division / District / Thana cascading filters
  (auto-selected when geolocation is denied)
- Save favorites; view full structured property details + Google Maps link
- Message and call landlords; agree on rent and pay
- Auto-generated rental history (visible to landlords for trust)

### Landlord

- Dashboard with earnings + deal stats
- Register / edit / hide / delete listings using the full BD schema:
  - **Section 1** Administrative — Division, District, City Corp (DNCC/DSCC),
    Thana/PS, Ward (1–99), Zone
  - **Section 2** Localized — Area/Moholla, Block/Sector, Road, Avenue/Lane
  - **Section 3** Unique keys — Holding Number (mandatory), House Name, Floor & Unit
  - **Section 4** Verification — Landmarks, Geo (URL/Plus code), GPS capture, Building Type
- Inline accept / reject of pending tenant deal proposals
- Tenant lookup — paste a tenant's User ID to view their rental history

---

## 2. Routes

| Path | Access | Purpose |
|------|--------|---------|

| `/` | public | Landing — choose Tenant or Landlord |
| `/auth` | public | Sign in / sign up (email + Google) |
| `/onboarding` | auth | Pick role after first sign-in |
| `/tenant` | tenant | Browse listings (Near me / By location) |
| `/favorites` | tenant | Saved listings |
| `/listings/:id` | public | Full listing detail + structured address |
| `/landlord` | landlord | Dashboard with earnings |
| `/landlord/listings` | landlord | My listings (edit/delete/hide) |
| `/landlord/listings/new` | landlord | Register a new property |
| `/landlord/listings/:id/edit` | landlord | Edit existing property |
| `/messages` | auth | Realtime chat + inline deal controls |
| `/payment/:agreementId` | tenant | Simulated payment |
| `/receipt/:id` | auth | Branded printable receipt |
| `/profile` | auth | Edit profile + copy User ID |
| `/kyc` | auth | NID + selfie upload |
| `/feedback` | auth | Leave / read peer-only feedback |
| `/history` | tenant | Own rental history |
| `/history/:userId` | landlord | View any tenant's history (lookup) |
| `/tenant-lookup` | landlord | Paste a tenant User ID to look them up |

---

## 3. Database schema

| Table | Purpose | RLS summary |
|-------|---------|-------------|

| `profiles` | Per-user profile (name, phone, avatar, bio) | Read by all auth users; write own only |
| `user_roles` | `tenant` / `landlord` (separate table — never on profile, prevents privilege escalation) | Insert/read own only |
| `listings` | Properties with full BD schema (16 address fields + lat/lng) | Public read of `is_active`; write own (landlord-role) |
| `divisions` / `districts` / `thanas` | BD admin-hierarchy lookup tables (8 / 64 / ~570 rows) | Public read |
| `favorites` | Tenant-saved listings | Own rows only |
| `conversations` | One per (listing, tenant, landlord) | Participants only |
| `messages` | Chat messages (realtime) | Participants only |
| `agreements` | Deal status: `pending` / `accepted` / `rejected` | Participants read; tenant insert; landlord update |
| `payments` | Simulated payments with unique receipt # | Participants only |
| `kyc` | NID numbers + Storage URLs | Own rows only |
| `feedback` | Peer reviews | Author reads own; **same-role peers** read others |

### Key SQL helpers

- `has_role(uid, role)` — `SECURITY DEFINER` predicate used by all role-aware RLS policies (avoids recursive RLS).
- `get_tenant_rental_history(tenant_id)` — RPC returning a tenant's completed payments. Callable by the tenant themselves OR by any landlord (for trust verification).
- Storage bucket **`kyc-docs`** (private) — folder-scoped RLS so each user only accesses their own folder.

---

## 4. Project layout

src/
├── assets/                       # Brand images
├── components/
│   ├── auth/ProtectedRoute.tsx   # Route gate (auth + role + onboarding redirect)
│   ├── layout/                   # Navbar (mobile sheet), Footer, AppLayout
│   ├── listings/ListingCard.tsx  # Card used in browse/favorites
│   └── ui/                       # shadcn primitives
├── contexts/AuthContext.tsx      # Session + profile + role (single source of truth)
├── hooks/
│   ├── useFavorites.ts
│   └── useMessageNotifications.ts # Split: Root (subscription) + reader hook
├── integrations/                 # Auto-generated Cloud client + types — DO NOT EDIT
├── lib/
│   ├── bd-locations.ts           # Division/District/Thana fetchers + Haversine
│   └── listings.ts               # Types, fmtBDT, formatAddress helper
└── pages/
    ├── Landing, Auth, Onboarding, Profile, Kyc, Feedback
    ├── TenantHome, Favorites, ListingDetail, RentalHistory
    ├── LandlordDashboard, MyListings, ListingForm, TenantLookup
    ├── Messages, Payment, Receipt
    └── NotFound
supabase/                         # Auto-managed migrations + config

---

## 5. Notifications model

- `useMessageNotificationsRoot()` is mounted **exactly once** inside `<Navbar />`
  and owns the realtime subscription on `public.messages`.
- All other components (Navbar badge, Messages page) call the read-only
  `useMessageNotifications()` hook to read the unread counter.
- Toasts use Sonner; browser notifications use the standard Notification API
  (permission requested on first auth).
- Background push (closed-tab) requires a service worker + FCM/APNs and is
  out of scope for the MVP.

---

## 6. Local development

```bash
bun install
bun run dev
```

Lovable Cloud is connected automatically — `.env`, the Supabase client, and
the generated TypeScript types are all managed for you. **Never hand-edit:**

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`

---

## 7. Deployment

1. Click **Publish** in the Lovable editor — instant deploy to a `*.lovable.app` URL.
2. Or export to GitHub and host on Vercel / Netlify with the same env vars.
3. Database, auth, and storage are managed by Lovable Cloud; nothing to provision.

---

## 8. Notes & limitations

- Payments are **simulated** — no real money moves. The receipt is for UX demo.
- Listing images are entered as URLs (Unsplash / your CDN). A storage bucket
  for direct image upload can be added later.
- `RentalHistory` for landlords is intentionally broad: any landlord with a
  valid User ID can pull any tenant's history. Tighten the RPC later if you
  want to restrict to landlords who actually transacted with that tenant.
- Theme uses the `mygov.bd` colour palette — Bangladesh green (`#006A4E`)
  primary + vermillion red (`#F42A41`) accent + green/red gov stripe.
