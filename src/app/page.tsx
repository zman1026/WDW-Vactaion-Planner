import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
          Plan your perfect{" "}
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Walt Disney World
          </span>{" "}
          adventure
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-600">
          Pick your travel dates, build day-by-day itineraries, choose restaurants,
          shows, attractions, and experiences — all while keeping track of time
          slots and budgets for the whole family.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            href="/trips/new"
            className="rounded-full bg-blue-600 px-8 py-3 text-white font-semibold shadow-lg hover:bg-blue-700 transition"
          >
            Start a New Trip
          </Link>
          <Link
            href="/explore"
            className="rounded-full border border-slate-300 bg-white px-8 py-3 font-semibold hover:bg-slate-50 transition"
          >
            Explore Parks & Attractions
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid md:grid-cols-3 gap-6">
        <FeatureCard
          title="📅 Smart Day Planning"
          description="Assign parks to each day, then drag attractions, shows, and dining into a timeline that respects opening hours and realistic walking times."
        />
        <FeatureCard
          title="🍽️ Dining & Experiences"
          description="Browse restaurants and shows with live data. Track reservations, budgets, and preferred time slots for the whole family."
        />
        <FeatureCard
          title="💰 Budget & Reality Check"
          description="Set a total budget and see estimated costs for tickets, meals, Lightning Lane, souvenirs, and more as you build your plan."
        />
      </section>

      {/* Status note */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-amber-900 font-medium">
          WDW Planner now supports private trips, day-by-day planning, budgets, live park context, and AI-assisted suggestions.
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Powered by ThemeParks.wiki for live park data. Always double-check the official
          My Disney Experience app for the latest hours, wait times, and reservations.
        </p>
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
