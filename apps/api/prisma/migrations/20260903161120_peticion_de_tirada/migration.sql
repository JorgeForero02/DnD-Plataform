-- CreateTable
CREATE TABLE "RollRequest" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dc" INTEGER,
    "mode" TEXT NOT NULL DEFAULT 'NORMAL',
    "audience" TEXT NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedEventId" TEXT,

    CONSTRAINT "RollRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RollRequest_campaignId_resolvedAt_idx" ON "RollRequest"("campaignId", "resolvedAt");

-- CreateIndex
CREATE INDEX "RollRequest_characterId_resolvedAt_idx" ON "RollRequest"("characterId", "resolvedAt");

-- AddForeignKey
ALTER TABLE "RollRequest" ADD CONSTRAINT "RollRequest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollRequest" ADD CONSTRAINT "RollRequest_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
