ALTER TABLE "Trip" ADD COLUMN "customHotelName" TEXT;

CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "dayPlanId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "confirmationNumber" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "costCents" INTEGER,
    "partySize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripCompanion" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'TRAVELER',
    "rsvp" TEXT NOT NULL DEFAULT 'GOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TripCompanion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Reservation_tripId_date_idx" ON "Reservation"("tripId", "date");
CREATE INDEX "Reservation_dayPlanId_idx" ON "Reservation"("dayPlanId");
CREATE INDEX "TripCompanion_tripId_idx" ON "TripCompanion"("tripId");

ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_dayPlanId_fkey" FOREIGN KEY ("dayPlanId") REFERENCES "DayPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TripCompanion" ADD CONSTRAINT "TripCompanion_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
