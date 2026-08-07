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
2. Copy `.env.example` → `.env` and fill in `DATABASE_URL`
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
- [ ] ThemeParks data sync & caching
- [ ] Trip creation (dates, budget)
- [ ] Day planner UI (drag & drop itinerary)
- [ ] Restaurant / show / attraction browser
- [ ] Simple auth (email or social)
- [ ] AI-assisted itinerary suggestions (Grok / ChatGPT)
- [ ] Export / share trip plans

## Data Source Notes

We use the free community API at [ThemeParks.wiki](https://themeparks.wiki).  
Always treat live wait times and schedules as approximate. The official source of truth is the My Disney Experience app and disneyworld.disney.go.com.
