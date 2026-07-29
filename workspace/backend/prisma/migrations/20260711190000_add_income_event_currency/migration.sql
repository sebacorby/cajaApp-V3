-- Preserve existing income events as ARS and enable explicit ARS/USD one-off events.
ALTER TABLE "IncomeEvent" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'ARS';
