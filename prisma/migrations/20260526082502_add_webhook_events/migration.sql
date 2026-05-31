-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "sourceEvent" TEXT NOT NULL,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAttemptedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "idempotencyKeyId" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_idempotencyKeyId_key" ON "webhook_events"("idempotencyKeyId");

-- CreateIndex
CREATE INDEX "webhook_events_source_processingStatus_idx" ON "webhook_events"("source", "processingStatus");

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_idempotencyKeyId_fkey" FOREIGN KEY ("idempotencyKeyId") REFERENCES "idempotency_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
