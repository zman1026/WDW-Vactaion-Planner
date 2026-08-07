CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Trip" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "budgetCents" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "hotelId" TEXT,
  CONSTRAINT "Trip_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Trip_userId_idx" ON "Trip"("userId");

CREATE TABLE IF NOT EXISTS "DayPlan" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "parkId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DayPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DayPlan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DayPlan_tripId_idx" ON "DayPlan"("tripId");
CREATE UNIQUE INDEX IF NOT EXISTS "DayPlan_tripId_date_key" ON "DayPlan"("tripId", "date");

CREATE TABLE IF NOT EXISTS "DayPlanItem" (
  "id" TEXT NOT NULL,
  "dayPlanId" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "estimatedCostCents" INTEGER,
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DayPlanItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DayPlanItem_dayPlanId_fkey" FOREIGN KEY ("dayPlanId") REFERENCES "DayPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DayPlanItem_dayPlanId_idx" ON "DayPlanItem"("dayPlanId");

CREATE TABLE IF NOT EXISTS "ParkEntity" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "parentId" TEXT,
  "destination" TEXT,
  "slug" TEXT,
  "location" TEXT,
  "description" TEXT,
  "rawData" JSONB,
  "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParkEntity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ParkEntity_entityType_idx" ON "ParkEntity"("entityType");
CREATE INDEX IF NOT EXISTS "ParkEntity_parentId_idx" ON "ParkEntity"("parentId");
CREATE INDEX IF NOT EXISTS "ParkEntity_destination_idx" ON "ParkEntity"("destination");
