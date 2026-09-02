-- CreateEnum
CREATE TYPE "RuleMode" AS ENUM ('AUTOMATIC', 'PROPOSAL');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('ARMED', 'DISARMED', 'BROKEN');

-- CreateEnum
CREATE TYPE "RuleTraceStatus" AS ENUM ('APPLIED', 'PROPOSED', 'REJECTED', 'STOPPED', 'CONFLICT');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "rulesEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "mode" "RuleMode" NOT NULL DEFAULT 'AUTOMATIC',
    "status" "RuleStatus" NOT NULL DEFAULT 'ARMED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "trigger" JSONB NOT NULL,
    "conditions" JSONB NOT NULL,
    "effects" JSONB NOT NULL,
    "maxFires" INTEGER,
    "fireCount" INTEGER NOT NULL DEFAULT 0,
    "lastFiredAt" TIMESTAMP(3),
    "brokenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleTrace" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "triggeredByUserId" TEXT NOT NULL,
    "delegatedByUserId" TEXT NOT NULL,
    "triggerEventId" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "chainId" TEXT NOT NULL,
    "status" "RuleTraceStatus" NOT NULL,
    "effects" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleTrace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rule_campaignId_status_idx" ON "Rule"("campaignId", "status");

-- CreateIndex
CREATE INDEX "RuleTrace_campaignId_createdAt_idx" ON "RuleTrace"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "RuleTrace_chainId_idx" ON "RuleTrace"("chainId");

-- CreateIndex
CREATE INDEX "RuleTrace_status_idx" ON "RuleTrace"("status");

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleTrace" ADD CONSTRAINT "RuleTrace_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
