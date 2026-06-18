Created [](file:///c%3A/Users/USER/.copilot/session-state/dbeb70db-7470-4bd1-bb66-ddd9f6a07b9d/files/ARCHITECTURE_OVERVIEW.md)

Let me create the file with content:

Created [](file:///c%3A/Users/USER/.copilot/session-state/dbeb70db-7470-4bd1-bb66-ddd9f6a07b9d/files/ARCHITECTURE_OVERVIEW.md)

Let me create a comprehensive analysis document now:

Ran terminal command

Let me create the analysis document properly:

Created [](file:///c%3A/Users/USER/.copilot/session-state/dbeb70db-7470-4bd1-bb66-ddd9f6a07b9d/files/PROJECT_ANALYSIS.md)

Let me provide the comprehensive analysis directly:

Ran terminal command

Let me create this file properly with PowerShell:

Ran terminal command

Let me output the comprehensive analysis here:

---

# 📋 SMART THIKANA - PROJECT ANALYSIS

## 1. PROJECT PURPOSE (What This App Does)

**Smart Thikana** is a **trust-first house-rental web platform tailored for Bangladesh**. It connects tenants searching for rental properties with landlords offering them, using Bangladesh's unique administrative structure and cultural context.

### Key Features:
- **Tenants**: Browse verified properties, save favorites, message landlords, pay rent digitally, and build rental history
- **Landlords**: Register properties using Bangladesh's official tax hierarchy, manage listings, review tenants, and track earnings
- **Trust System**: Peer feedback, auto-generated rental history, and KYC verification (NID documents)
- **Smart Location Search**: GPS "Near me" mode + cascading filters (Division → District → Thana)
- **Digital Payment Flow**: Propose rent agreement → Accept/Reject → Pay → Print receipt
- **Realtime Communication**: 1-to-1 chat between tenant and landlord with browser notifications

---

## 2. FOLDER STRUCTURE EXPLANATION

```
Smart-Thikana/
├── src/                          # Frontend React application
│   ├── assets/                   # Brand images & logos
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.tsx         # Role-gated route wrapper
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                 # Mobile-responsive header with notifications
│   │   │   ├── Footer.tsx                 # Footer component
│   │   │   └── AppLayout.tsx              # Shell (Navbar + Outlet + Footer)
│   │   ├── listings/
│   │   │   └── ListingCard.tsx            # Reusable property card component
│   │   └── ui/                            # shadcn/ui primitives (Button, Dialog, etc)
│   ├── contexts/
│   │   └── AuthContext.tsx                # Global auth state (session, profile, role)
│   ├── hooks/
│   │   ├── useFavorites.ts                # Tenant favorites list management
│   │   └── useMessageNotifications.ts     # Realtime message notifications
│   ├── integrations/
│   │   └── supabase/                      # Auto-generated Supabase client & types
│   ├── lib/
│   │   ├── bd-locations.ts               # BD admin hierarchy (divisions/districts/thanas)
│   │   ├── listings.ts                   # Types, formatAddress, currency helpers
│   │   ├── tax-engine.ts                 # Custom tax calculation algorithms
│   │   └── utils.ts                      # General utilities
│   ├── pages/                             # Route components
│   │   ├── Index.tsx                     # Landing page (choose role)
│   │   ├── Auth.tsx                      # Sign in/sign up
│   │   ├── Onboarding.tsx                # Pick tenant or landlord role
│   │   ├── TenantHome.tsx                # Browse listings (Near me / By location)
│   │   ├── Favorites.tsx                 # Saved listings
│   │   ├── ListingDetail.tsx             # Full property details + maps
│   │   ├── LandlordDashboard.tsx         # Earnings + stats
│   │   ├── MyListings.tsx                # Landlord's properties
│   │   ├── ListingForm.tsx               # Register/edit property (4 sections)
│   │   ├── Messages.tsx                  # Realtime chat interface
│   │   ├── Payment.tsx                   # Simulated payment page
│   │   ├── Receipt.tsx                   # Printable rent receipt
│   │   ├── Profile.tsx                   # Edit profile + copy User ID
│   │   ├── Kyc.tsx                       # NID + selfie upload
│   │   ├── Feedback.tsx                  # Peer reviews
│   │   ├── RentalHistory.tsx             # Own history or tenant lookup
│   │   ├── TenantLookup.tsx              # Search by User ID
│   │   ├── TenantLifeCycle.tsx           # Tenant onboarding flow
│   │   └── NotFound.tsx                  # 404 page
│   ├── features/
│   │   └── services/                     # Home services add-on module
│   ├── App.tsx                           # Router setup & providers
│   ├── main.tsx                          # React entry point
│   └── index.css                         # Global Tailwind styles
├── backend/                      # Self-hosted Supabase (Docker)
│   ├── docker-compose.yml        # Local Postgres + Auth + Realtime
│   ├── volumes/db/
│   │   ├── 01-schema.sql        # Tables, RLS policies, triggers
│   │   └── 02-seed.sql          # Sample data
│   └── scripts/
│       ├── reset.sh             # Reset database
│       └── migrate.sh           # Apply schema changes
├── supabase/
│   ├── config.toml              # Supabase project config
│   └── migrations/              # Auto-generated SQL migrations
├── public/                       # Static assets (favicon, etc)
├── package.json                  # Dependencies & scripts
├── vite.config.ts               # Vite bundler config
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind CSS theme
├── eslint.config.js             # Linting rules
└── vitest.config.ts             # Test runner config
```

---

## 3. TECHNOLOGY USED

### Frontend Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 18 + TypeScript | Component-based UI with type safety |
| **Bundler** | Vite 7 | Fast dev server & production builds |
| **Routing** | React Router v6 | Client-side navigation |
| **State Management** | React Context + React Query | Global auth context + data caching |
| **UI Components** | shadcn/ui (Radix UI) | Accessible, unstyled component primitives |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS framework |
| **Forms** | React Hook Form + Zod | Type-safe form validation |
| **Charts** | Recharts | Dashboard analytics (earnings, stats) |
| **Notifications** | Sonner + Browser Notification API | In-app toasts + system notifications |
| **Icons** | Lucide React | Modern SVG icons |
| **Date Handling** | date-fns | Date formatting & manipulation |
| **HTTP Client** | Supabase JS SDK | Backend API & Realtime subscriptions |
| **Testing** | Vitest + Testing Library | Unit & component tests |

### Backend Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Database** | PostgreSQL 15 | ACID-compliant relational DB |
| **ORM** | PostgREST API | Auto-generated REST endpoints from SQL |
| **Auth** | Supabase GoTrue | Email/password + OAuth 2.0 (Google) |
| **Realtime** | Supabase Realtime | WebSocket subscriptions for chat & notifications |
| **Storage** | Supabase Storage | KYC document bucket (private, folder-scoped) |
| **RLS** | PostgreSQL Row-Level Security | Data protection per user/role |
| **Hosting** | Lovable Cloud OR Self-hosted Docker | Managed or self-managed deployment |

### Development Tools
- **Linting**: ESLint 9 + TypeScript ESLint
- **Version Control**: Git
- **Package Manager**: Bun (or npm)
- **Environment**: Node.js ≥ 20

---

## 4. BACKEND & FRONTEND FLOW

### Authentication Flow
```
User visits app
    ↓
[App.tsx] → <AuthProvider>
    ↓
AuthContext calls supabase.auth.onAuthStateChange()
    ↓
If logged in: fetch profile + role from DB
    ↓
Set global state: { session, user, profile, role }
    ↓
All pages subscribe to AuthContext via useAuth()
```

### Tenant Home - Browse Flow (Frontend to Backend)
```
TenantHome.tsx loads
    ↓
User chooses: "Near me" OR "By location"
    ↓
[Near me mode]
- Browser geolocation API → get GPS coords
- Query listings with lat/lng
- Sort by Haversine distance

[By location mode]
- fetchDivisions() → Supabase
- User picks Division
- fetchDistricts(division) → filtered districts
- User picks District
- fetchThanas(district) → filtered thanas
- Query listings filtered by thana
    ↓
Render ListingCard components in grid
```

### Landlord Listing Registration Flow (Frontend to Backend)
```
Landlord clicks "New Listing"
    ↓
ListingForm.tsx renders 4-section form:
1. Administrative: Division → District → City Corp → Thana → Ward/Zone
2. Localized address: Area/Moholla, Block, Road, Avenue
3. Unique keys: Holding #, House name, Floor/Unit
4. Verification: Landmarks, GPS capture, Building type
    ↓
Form validation with Zod
    ↓
User clicks "Register"
    ↓
INSERT into listings table (16 address fields + lat/lng)
    ↓
Supabase RLS checks: INSERT allowed if landlord_id = auth.uid()
    ↓
Listing appears in MyListings + searchable for tenants
```

### Message/Chat Flow (Realtime)
```
Tenant clicks "Message landlord" on listing
    ↓
App checks if conversation exists between (tenant, landlord, listing_id)
    ↓
If not: CREATE conversation row
    ↓
Navigate to /messages?c={conversation_id}
    ↓
Navbar.tsx mounts useMessageNotificationsRoot()
    ↓
Supabase Realtime subscription on "messages" table
    ↓
New message event → in-app toast + browser notification
    ↓
Messages.tsx displays chat history + input
    ↓
Agreement strip shows deal status (pending → accepted/rejected)
```

### Payment & Rental History Flow
```
Tenant initiates payment on listing
    ↓
Navigate to /payment/{agreementId}
    ↓
Simulated payment (no real money moves)
    ↓
Payment data saved to "payments" table
    ↓
Auto-triggers: INSERT rental history
    ↓
RentalHistory view shows completed payments
    ↓
Tenant can share User ID with landlord for background check
    ↓
Landlord uses TenantLookup → views rental_history RPC
```

### API Endpoints Flow (Supabase PostgREST)
```
Frontend calls:
  GET    /rest/v1/listings?is_active=eq.true&division=eq.Dhaka
  POST   /rest/v1/agreements (with tenant_id, landlord_id, status)
  PATCH  /rest/v1/profiles?id=eq.{uid} (update avatar, name, etc)
  DELETE /rest/v1/listings?id=eq.{id} (landlord delete own listing)
    ↓
Supabase RLS policies intercept:
  - Is user authenticated?
  - Does user own this row / have correct role?
    ↓
If allowed: PostgREST returns data
If denied: 403 Forbidden
```

---

## 5. DATABASE USAGE

### Core Tables

| Table | Purpose | Ownership | Key Fields |
|-------|---------|-----------|-----------|
| **profiles** | Per-user info | User owns their row | id, full_name, phone, avatar_url, bio, business_name, preferences |
| **user_roles** | Tenant/Landlord assignment (separate table = privilege escalation prevention) | User owns their role | user_id, role |
| **listings** | Rental properties with full BD schema | Landlord owns their listings | id, landlord_id, title, price, 16 address fields, lat/lng, is_active |
| **divisions** | Bangladesh admin level 1 (8 total) | Public read | id, name, name_bn |
| **districts** | Bangladesh admin level 2 (64 total) | Public read | id, division_id, name, name_bn |
| **thanas** | Bangladesh admin level 3 (~500 total) | Public read | id, district_id, name, name_bn |
| **favorites** | Tenant-saved listings | Tenant owns their favorites | id, tenant_id, listing_id |
| **conversations** | Chat threads (one per listing, tenant, landlord trio) | Participants only | id, listing_id, tenant_id, landlord_id, created_at |
| **messages** | Individual chat messages | Participants only (realtime) | id, conversation_id, sender_id, content, created_at |
| **agreements** | Rental deal status | Participants | id, listing_id, tenant_id, landlord_id, status, proposed_rent |
| **payments** | Rent payments (simulated) | Participants | id, agreement_id, amount, receipt_number, created_at |
| **kyc** | KYC verification documents | User owns their KYC | user_id, nid_number, nid_front_url, nid_back_url, selfie_url |
| **feedback** | Peer reviews | Peer-only visibility via RLS | id, author_id, target_id, rating, comment, created_at |

### Views & Functions
| Name | Type | Purpose |
|------|------|---------|
| **rental_history** | View | Auto-derived from payments table; shows completed rent payments per tenant |
| **get_tenant_rental_history(uuid)** | RPC | Security-definer function; landlords can pull any tenant's history by User ID |
| **has_role(uid, role)** | Function | SECURITY DEFINER; used by all RLS policies to check role without recursive queries |

### Storage Buckets
| Bucket | Access | Purpose |
|--------|--------|---------|
| **kyc-docs** | Private | Folder-scoped RLS; each user can only access `<user_id>/...` |

### Row-Level Security (RLS) Policies
- **profiles**: Read by all auth users; write own only
- **listings**: Public read if `is_active=true`; write own (landlord-role) only
- **user_roles**: Insert/read own only
- **favorites**: Own rows only
- **conversations**: Participants only
- **messages**: Participants only (realtime)
- **agreements**: Participants read; tenant insert; landlord update
- **payments**: Participants only
- **kyc**: Own rows only
- **feedback**: Author reads own; same-role peers read others (landlord ↔ landlord, tenant ↔ tenant)

---

## 6. KEY COMPONENTS & THEIR ROLE

### Context Providers (Global State)

#### **AuthContext** (`src/contexts/AuthContext.tsx`)
- **Purpose**: Single source of truth for "who is logged in"
- **State**: `session`, `user`, `profile`, `role`, `loading`
- **Key Methods**: `loadProfileAndRole()`, `signOut()`, `refreshProfile()`
- **Usage**: Every page calls `useAuth()` to check permissions
- **Anti-deadlock pattern**: Uses `setTimeout(..., 0)` to defer profile fetches after auth callback returns

### Route Components (Pages)

#### **Protected Route** (`src/components/auth/ProtectedRoute.tsx`)
- **Purpose**: Gate routes on authentication + role
- **Logic**:
  1. If loading → show spinner
  2. If not authenticated → redirect to `/auth`
  3. If no role → redirect to `/onboarding`
  4. If wrong role → redirect to correct dashboard
- **Defence-in-depth**: Frontend UX protection; RLS is the real security boundary

#### **AppLayout** (`src/components/layout/AppLayout.tsx`)
- **Purpose**: Shared shell for all pages
- **Children**: Navbar (with message badge) → `<Outlet />` → Footer

#### **Navbar** (`src/components/layout/Navbar.tsx`)
- **Purpose**: Header with mobile hamburger + message notifications
- **Unique feature**: Mounts `useMessageNotificationsRoot()` (exactly once)
- **Shows**: Logo, nav links, unread message badge, theme toggle, auth menu

### List Components

#### **ListingCard** (`src/components/listings/ListingCard.tsx`)
- **Purpose**: Reusable card showing property preview
- **Data**: Image, title, price, location, ratings
- **Actions**: "View details", "Save to favorites", "Message landlord"

### Custom Hooks

#### **useFavorites** (`src/hooks/useFavorites.ts`)
- **Purpose**: Manage tenant's saved listings
- **Methods**: `toggleFavorite()`, `isFavorited()`, `getFavorites()`
- **Auto-synced**: Changes immediately reflect across app

#### **useMessageNotifications** (`src/hooks/useMessageNotifications.ts`)
- **Purpose**: Realtime unread message counter
- **Root variant** (`useMessageNotificationsRoot`): Mounts subscription (in Navbar only)
- **Reader variant** (`useMessageNotifications`): Read-only hook (all other components)
- **Pattern**: Centralized subscription prevents duplicate listeners

### Utility Modules

#### **bd-locations.ts** (`src/lib/bd-locations.ts`)
- **Exports**: `fetchDivisions()`, `fetchDistricts()`, `fetchThanas()`
- **Also**: Haversine distance calculator for "Near me" sorting
- **Data**: Public read from divisions/districts/thanas tables

#### **listings.ts** (`src/lib/listings.ts`)
- **Exports**: Type definitions (`Listing`, `PropertyType`, etc)
- **Helpers**: `formatAddress()`, `fmtBDT()` (Bengali Taka formatting)
- **Constants**: `PROPERTY_TYPES`, `CITY_CORPS`, `BUILDING_TYPES`

#### **tax-engine.ts** (`src/lib/tax-engine.ts`)
- **Purpose**: Custom tax calculation (Slab350X, MinAdv-109V algorithms)
- **Used by**: Landlord dashboard earnings calculations
- **Config**: Section-109 Government tax rules for Bangladesh

### Major Page Components

#### **TenantHome** (`src/pages/TenantHome.tsx`)
- **Features**: Two browse modes (Near me / By location)
- **Near me**: GPS geolocation → Haversine sort
- **By location**: Cascading dropdowns (Division → District → Thana)
- **Output**: Grid of ListingCards

#### **LandlordDashboard** (`src/pages/LandlordDashboard.tsx`)
- **Shows**: Total earnings, pending deals, completed payments
- **Charts**: Monthly revenue trend (Recharts)
- **Quick actions**: Edit profile, review new messages

#### **ListingForm** (`src/pages/ListingForm.tsx`)
- **4 sections**:
  1. Administrative: Division/District/City Corp/Thana/Ward/Zone
  2. Localized: Moholla/Block/Road/Avenue
  3. Unique keys: Holding #, House name, Floor/Unit
  4. Verification: Landmarks, GPS capture, Building type
- **Validation**: Zod schema
- **Submit**: POST to `listings` table or PATCH if editing

#### **Messages** (`src/pages/Messages.tsx`)
- **Layout**: Conversation list + active chat
- **Realtime**: Supabase subscription on `messages`
- **Deal strip**: Shows agreement status (pending/accepted/rejected)
- **Actions**: Inline accept/reject tenant proposal

#### **Payment** (`src/pages/Payment.tsx`)
- **Simulated payment** (no real money)
- **Inputs**: Amount, payment method (for UX demo)
- **Output**: Creates `payments` row + generates receipt #

#### **Receipt** (`src/pages/Receipt.tsx`)
- **Printable page** with rent details
- **Shows**: Tenant name, landlord name, property address (structured), amount, month
- **Links**: Google Maps link to property location
- **Actions**: Print button, download as PDF (browser feature)

#### **RentalHistory** (`src/pages/RentalHistory.tsx`)
- **Tenant mode** (`/history`): Shows own completed payments
- **Landlord lookup** (`/history/:userId`): Paste tenant User ID to view their history
- **Query**: Calls `get_tenant_rental_history(uuid)` RPC
- **Trust**: Visible to landlords for background checks

#### **TenantLookup** (`src/pages/TenantLookup.tsx`)
- **Purpose**: Landlord searches tenant by User ID
- **Input**: Paste User ID from tenant's Profile page
- **Output**: Redirects to `/history/{userId}`

---

## 7. ENTRY POINT OF THE APPLICATION

### Client Entry Point (`src/main.tsx`)
```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

### App Setup (`src/App.tsx`)
```
QueryClientProvider (React Query)
  ├─ TooltipProvider (shadcn/ui)
  ├─ Toaster (Sonner)
  ├─ Toaster (shadcn/ui)
  └─ BrowserRouter (React Router)
      └─ AuthProvider (AuthContext)
          └─ Routes
              └─ AppLayout (shell)
                  ├─ / (Landing)
                  ├─ /auth (Login/Signup)
                  ├─ /onboarding (Role picker)
                  ├─ /tenant (Protected, tenant-only)
                  ├─ /landlord (Protected, landlord-only)
                  ├─ /messages (Protected)
                  ├─ /profile (Protected)
                  └─ ... (30+ routes)
```

### Build & Runtime
1. **Development**: `bun run dev` → Vite dev server on `http://localhost:5173`
2. **Production**: `bun run build` → Outputs to `dist/`
3. **Deployment**: Static files served from Vercel / Netlify / GitHub Pages

---

## 8. ARCHITECTURE DIAGRAM & API FLOW

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (User)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript Application                  │   │
│  │  ├─ AuthContext (session, profile, role)           │   │
│  │  ├─ React Query (data caching)                      │   │
│  │  ├─ React Router (SPA navigation)                   │   │
│  │  ├─ Pages (Tenant, Landlord, Messages, etc)        │   │
│  │  └─ shadcn/ui Components (forms, dialogs, etc)     │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↓                                     │
│              Vite (Hot module reload)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
            REST API + WebSocket Realtime
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ↓                  ↓                  ↓
┌──────────────┐  ┌─────────────────┐  ┌──────────────┐
│ PostgREST    │  │ GoTrue Auth     │  │  Realtime    │
│ (CRUD API)   │  │ (JWT tokens)    │  │  (WebSocket) │
└──────┬───────┘  └────────┬────────┘  └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
          ↓                                 ↓
    ┌──────────────┐              ┌─────────────────┐
    │ PostgreSQL   │              │  Supabase       │
    │ Database     │              │  Storage (S3)   │
    │ (RLS, RPC)   │              │  (KYC bucket)   │
    └──────────────┘              └─────────────────┘
```

### API Flow (Example: Tenant Viewing Listings)

```
1. AUTHENTICATION
   Browser → GET /auth/v1/session
   ↓
   Supabase GoTrue → validates JWT
   ↓
   Returns: { user, session } or null

2. LOAD AUTH CONTEXT
   AuthProvider.tsx calls onAuthStateChange()
   ↓
   Fetches profile + role in parallel:
     - GET /rest/v1/profiles?id=eq.{uid}
     - GET /rest/v1/user_roles?user_id=eq.{uid}
   ↓
   Sets: useAuth() = { session, user, profile, role }

3. FETCH LISTINGS
   TenantHome.tsx renders
   ↓
   User selects "By location" → Dhaka → Gulshan → Banani
   ↓
   Query: GET /rest/v1/listings?
          division=eq.Dhaka&
          district=eq.Gulshan&
          thana=eq.Banani&
          is_active=eq.true
   ↓
   PostgREST checks RLS:
     - is_active = true? → Public read allowed
   ↓
   Returns: [ { id, title, price, images, ... }, ... ]

4. RENDER LISTINGS
   Map response → ListingCard components
   ↓
   User clicks "View Details" on a card
   ↓
   Navigate to /listings/{id}

5. FETCH SINGLE LISTING
   ListingDetail.tsx mounts
   ↓
   GET /rest/v1/listings?id=eq.{id}.single()
   ↓
   PostgREST checks RLS: is_active=true → allowed
   ↓
   Render full property details + structured address + Google Maps

6. MESSAGE LANDLORD
   User clicks "Message" button
   ↓
   Check if conversation exists:
     GET /rest/v1/conversations?
         listing_id=eq.{id}&
         tenant_id=eq.{auth.uid}&
         landlord_id=eq.{landlord_id}
   ↓
   If not: POST /rest/v1/conversations { listing_id, tenant_id, landlord_id }
   ↓
   Navigate to /messages?c={conversation_id}
   ↓
   Supabase Realtime subscription on messages channel
```

### Realtime Flow (Example: Chat Notifications)

```
1. USER A SENDS MESSAGE
   Messages.tsx → POST /rest/v1/messages {
     conversation_id, sender_id, content, created_at
   }
   ↓
   Database trigger: INSERT → broadcast to realtime channel

2. REALTIME BROADCAST
   Supabase Realtime publishes event to:
     "schema=public.broadcast:messages"
   ↓
   All WebSocket subscribers receive: {
     type: "INSERT",
     new: { id, content, sender_id, ... }
   }

3. USER B RECEIVES UPDATE
   Navbar.tsx subscribed via useMessageNotificationsRoot()
   ↓
   Realtime event arrives → React state updates
   ↓
   Unread badge increments → toast displays
   ↓
   If browser notification permission granted: system notification fires

4. BOTH USERS SEE MESSAGE
   Chat components re-render
   ↓
   Message appears in conversation thread
   ↓
   Users marked as seen (automatic)
```

### RLS Policy Examples

```sql
-- Listings: Public read active listings, landlord-only write
CREATE POLICY listings_select ON listings FOR SELECT
  USING (is_active = true OR landlord_id = auth.uid());

CREATE POLICY listings_insert ON listings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'landlord') AND landlord_id = auth.uid());

-- Messages: Participants only
CREATE POLICY messages_read ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.tenant_id = auth.uid() OR c.landlord_id = auth.uid())
    )
  );

-- Feedback: Peer-only visibility
CREATE POLICY feedback_read ON feedback FOR SELECT
  USING (
    author_id = auth.uid() OR (
      target_id = auth.uid() AND
      has_role(auth.uid(), target_role)  -- same role as author
    )
  );
```

---

# 🏗️ ARCHITECTURE OVERVIEW (Summary)

## System Architecture
- **Frontend**: React 18 SPA (Vite) → Tailwind + shadcn/ui
- **Backend**: Supabase (Managed PostgreSQL + Auth + Realtime)
- **Authentication**: Supabase GoTrue (Email/Password + Google OAuth)
- **Database**: PostgreSQL 15 with Row-Level Security
- **Realtime**: WebSocket Realtime channel for chat & notifications
- **Storage**: Private KYC bucket (folder-scoped RLS)
- **Deployment**: Vercel/Netlify (frontend) + Lovable Cloud (backend)

## Data Flow Layers
1. **Presentation**: React components with TypeScript
2. **State Management**: AuthContext + React Query
3. **API Communication**: Supabase JS SDK (REST + Realtime)
4. **Security**: Row-Level Security policies at DB layer
5. **Business Logic**: Tax calculations, rental history RPC

## Key Design Patterns
- **Single AuthContext**: All pages subscribe for session/profile/role
- **Centralized Realtime**: One subscription in Navbar, read-only hooks elsewhere
- **Role-Based Access**: Separate `user_roles` table prevents privilege escalation
- **BD Admin Hierarchy**: Public lookup tables (divisions → districts → thanas)
- **Trust System**: Auto-generated rental history from payments
- **Mobile-First**: Hamburger nav, responsive Tailwind grid

## Security Layers
1. **Frontend**: ProtectedRoute redirects unauthorized users
2. **Database**: RLS policies enforce row-level access
3. **Auth**: JWT tokens managed by Supabase GoTrue
4. **Storage**: Private bucket with folder-scoped RLS
5. **Secrets**: `.env` only contains publishable anon key

---

Created with comprehensive project analysis ✅