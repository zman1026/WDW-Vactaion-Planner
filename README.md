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
2. Copy `.env.example` → `.env` and fill in `DATABASE_URL`. Configure a GitHub OAuth app and set `NEXTAUTH_SECRET`, `GITHUB_ID`, and `GITHUB_SECRET`; use `http://localhost:3000/api/auth/callback/github` as the local callback URL.
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
3. Add a PostgreSQL database service
4. Railway will automatically set `DATABASE_URL`
5. Deploy – it will run `npm install` + `npm run build`

Optional: Add a cron job later for periodic ThemeParks data sync.

## Project Structure

```
src/
  app/           # Next.js App Router pages
  components/    # React components
  lib/           # Utilities, ThemeParks client, Prisma client
prisma/
  schema.prisma  # Database models (User, Trip, DayPlan, ParkEntity, etc.)
```

## Roadmap (high level)

- [x] Project scaffolding
- [x] Trip creation and per-user trip list (dates, budget, day count)
- [x] Idempotent ThemeParks WDW hierarchy sync and database cache
- [x] Day planner UI (park/rest-day assignment and itinerary item CRUD)
- [x] Restaurant / show / attraction browser with cached search
- [x] Simple itinerary ordering (up/down controls)
- [x] Auth.js GitHub authentication with user-scoped trips
- [x] Budget roll-up and richer Explore filters/live data
- [x] Printable shareable trip summary
- [x] AI-assisted itinerary suggestions (OpenAI or xAI)
- [x] Park-hours, showtime, and time-conflict helper

### Phase 1 complete

The core planning loop is implemented. `POST /api/entities/sync` refreshes the WDW entity cache, and the entity search endpoint automatically attempts the first sync when the cache is empty. All sync writes are upserts, so refreshes are safe to repeat.

### Phase 2 complete

GitHub OAuth sessions replace the temporary local user. To claim trips created before authentication, set `MIGRATE_LOCAL_TRIPS_TO_EMAIL` to the intended account email for one login, then remove it. Trip details now roll up planned item costs against the budget. Explore supports park, type, text, and optional live-data filtering. Every trip also has a printable, unlisted share view; anyone with its opaque URL can view it.

### Phase 3 complete

Each park day can request an AI-generated itinerary based on party preferences and existing items. Suggestions use a Responses API-compatible client, are schema validated, restricted to cached entities, and require explicit confirmation before being added. The timing helper detects overlapping itinerary items and can fetch available live park hours and planned-show showtimes. Always verify generated plans and third-party timing data in My Disney Experience.

## Data Source Notes

We use the free community API at [ThemeParks.wiki](https://themeparks.wiki).  
Always treat live wait times and schedules as approximate. The official source of truth is the My Disney Experience app and disneyworld.disney.go.com.
