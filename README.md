# WDW Planner – Family Walt Disney World Vacation Planning Center

An online planning hub for individuals and families to plan every aspect of a Walt Disney World trip:

- Choose travel dates
- Build day-by-day itineraries (parks, attractions, shows, experiences)
- Plan restaurants and dining with time slots
- Track budgets
- Use live data from ThemeParks.wiki for attractions, restaurants, hotels, shows, and schedules

**Not affiliated with The Walt Disney Company.**

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS**
- **Prisma** + PostgreSQL (Railway)
- **ThemeParks.wiki** API for dynamic park data

## Getting Started (Local)

1. Clone the repo
2. Copy `.env.example` → `.env` and fill in `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma client & push schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000)

## Deploying to Railway

1. Create a new Railway project
2. Connect this GitHub repository
3. Add a PostgreSQL database service.
4. In the WDW Planner web service, open **Variables**, choose **Add Reference Variable**, and select `DATABASE_URL` from the PostgreSQL service. Its value should display as `${{Postgres.DATABASE_URL}}` when that service is named `Postgres`; never paste the local `.env.example` URL into Railway.
5. Add `NEXTAUTH_URL` (your Railway public URL) and `NEXTAUTH_SECRET` to the web service variables. Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32` or another cryptographically secure generator.
6. Deploy. The start command validates the database URL and runs `prisma migrate deploy` with bounded retries before Next.js starts, so a new database receives the required tables.

If `NEXTAUTH_SECRET` is absent, public pages remain available but sign-in and private trip pages are intentionally disabled. Never commit a production secret or `DATABASE_URL` to the repository.

Optional: schedule a periodic `POST /api/entities/sync` job to refresh the ThemeParks directory. The sync is idempotent, and the application also offers an in-product sync button when the cache is empty.

The public repository name contains the historical `Vactaion` typo. Deployment and application behavior are unaffected.

## Project Structure

```
src/
  app/           # Next.js App Router pages
  components/    # React components
  lib/           # Utilities, ThemeParks client, Prisma client
prisma/
  schema.prisma  # Database models (User, Trip, DayPlan, ParkEntity, etc.)
```

## Product design system

- Warm family-travel journal palette with navy, antique gold, parchment, and park-specific accents
- Centralized day themes in `src/lib/day-themes.ts`, applied with scoped `data-theme` attributes and CSS variables. Rest days use a mapped hotel personality when recognized and the polished `rest` fallback otherwise.
- Shared cards, controls, buttons, badges, empty states, budget meter, and accessible modal primitives
- Focused trip workspace with a scrollable day rail, timeline bands, and mobile sheet editing

## Roadmap (high level)

- [x] Project scaffolding
- [x] Trip creation and per-user trip list (dates, budget, day count)
- [x] Idempotent ThemeParks WDW hierarchy sync and database cache
- [x] Day planner UI (park/rest-day assignment and itinerary item CRUD)
- [x] Restaurant / show / attraction browser with cached search
- [x] Simple itinerary ordering (up/down controls)
- [x] Auth.js email/password authentication with user-scoped trips
- [x] Budget roll-up and richer Explore filters/live data
- [x] Printable shareable trip summary
- [x] AI-assisted itinerary suggestions (OpenAI or xAI)
- [x] Park-hours, showtime, and time-conflict helper
- [x] Trip editing/deletion with safe date-range reconciliation
- [x] WDW hotel assignment and share-view display
- [x] Party profile reused by AI suggestions
- [x] Clear/copy planning-day actions and mobile planner improvements
- [x] Flexible item timing: fixed reservations, part-of-day preferences, or anytime
- [x] Park-scoped searchable offering dropdowns by category
- [x] Immersive park and hotel day themes with themed overview, timeline, mobile rail, and print-safe share program
- [x] Dining booking details, confirmation numbers, party-size overrides, and backup plans
- [x] Explicit Lightning Lane, special-event, and other paid-extra tracking with budget callouts
- [x] Trip-level must-do board with assignment onto planning days
- [x] Primary plus secondary park support for hopper days
- [x] Themed Explore park hubs with optional live data and add-to-day controls
- [x] Guided trip setup, cache-resolved starter plans, and lightweight day-rhythm coaching
- [x] Optional Google OAuth alongside email/password authentication
- [x] View-only share framing, copy-link action, and optional hidden costs

### Phase 1 complete

The core planning loop is implemented. `POST /api/entities/sync` refreshes the WDW entity cache, and the entity search endpoint automatically attempts the first sync when the cache is empty. All sync writes are upserts, so refreshes are safe to repeat.

### Phase 2 complete

Email/password sessions replace the temporary local user. Passwords are salted and hashed with bcrypt and are never stored in readable form. To claim trips created before authentication, set `MIGRATE_LOCAL_TRIPS_TO_EMAIL` to the intended account email for one login, then remove it. Trip details now roll up planned item costs against the budget. Explore supports park, type, text, and optional live-data filtering. Every trip also has a printable, unlisted share view; anyone with its opaque URL can view it.

### Phase 3 complete

Each park day can request an AI-generated itinerary based on party preferences and existing items. Suggestions use a Responses API-compatible client, are schema validated, restricted to cached entities, and require explicit confirmation before being added. The timing helper detects overlapping itinerary items and can fetch available live park hours and planned-show showtimes. Always verify generated plans and third-party timing data in My Disney Experience.

### Phase 4 complete

Trips can be edited or deleted, assigned a cached WDW hotel, and given a reusable party profile containing party size, ages, dietary/accessibility notes, must-dos, and avoids. Extending dates creates missing planning days. Shortening dates removes only empty out-of-range days; if an excluded day has a park, notes, or itinerary items, the update is blocked until that day is cleared so planned data is never silently lost. Day cards support clearing all items and appending a copy of one day's items to another day in the same trip. Hotel and party details appear in the printable share view, and saved party details are automatically included in AI suggestions.

Itinerary timing is independent of entity type. Attractions, restaurants, shows, and experiences can use a fixed reservation/showtime, a preferred morning/afternoon/evening slot, or remain flexible for any time. Only fixed items participate in exact overlap warnings.

The item picker supports discovery as well as name search. Selecting Attractions, Restaurants, Shows, or Experiences loads the available cached offerings for that day's park; users can browse the dropdown alphabetically or type to filter it.

### Planning workflows and themed places

`src/lib/day-themes.ts` is the single resolver for park and hotel identities. Primary parks determine a day's theme; rest days map recognized hotel names to Victorian, modern, tropical, wilderness, coastal, or savanna personalities, with the polished `rest` theme as the fallback. A secondary park adds hopper context without changing the primary theme.

The `20260810230000_planning_workflows` migration adds nullable dining and paid-extra fields, `DayPlan.secondaryParkId`, and the trip-scoped `MustDo` model. Existing itinerary items remain valid because operational fields are nullable or use the `NONE` default.

Explore reports the directory's latest sync time and supports adding cached entities directly to a signed-in trip day. For production freshness, set `CRON_SECRET` and schedule a Railway cron request to `POST /api/entities/sync` with `Authorization: Bearer <CRON_SECRET>`; signed-in users can also refresh in the app. Entity writes are idempotent upserts.

Google sign-in is optional. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and register `/api/auth/callback/google` for the deployment URL. Email/password registration and sign-in remain available.

## Data Source Notes

We use the free community API at [ThemeParks.wiki](https://themeparks.wiki).  
Always treat live wait times and schedules as approximate. The official source of truth is the My Disney Experience app and disneyworld.disney.go.com.
