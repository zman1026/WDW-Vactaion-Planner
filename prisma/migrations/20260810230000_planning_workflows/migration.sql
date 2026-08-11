ALTER TABLE "DayPlan" ADD COLUMN "secondaryParkId" TEXT;

ALTER TABLE "DayPlanItem"
ADD COLUMN "bookingStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "confirmationNumber" TEXT,
ADD COLUMN "partySizeOverride" INTEGER,
ADD COLUMN "backupNote" TEXT,
ADD COLUMN "paidExtraType" TEXT;

CREATE TABLE "MustDo" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "dayPlanItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MustDo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MustDo_dayPlanItemId_key" ON "MustDo"("dayPlanItemId");
CREATE INDEX "MustDo_tripId_idx" ON "MustDo"("tripId");
ALTER TABLE "MustDo" ADD CONSTRAINT "MustDo_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MustDo" ADD CONSTRAINT "MustDo_dayPlanItemId_fkey" FOREIGN KEY ("dayPlanItemId") REFERENCES "DayPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
