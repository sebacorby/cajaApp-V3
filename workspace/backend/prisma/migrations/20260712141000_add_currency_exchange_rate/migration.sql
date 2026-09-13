CREATE TABLE "CurrencyExchangeRate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pair" TEXT NOT NULL,
  "rateRaw" TEXT NOT NULL,
  "effectiveDate" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "CurrencyExchangeRate_pair_key" ON "CurrencyExchangeRate"("pair");
CREATE INDEX "CurrencyExchangeRate_status_idx" ON "CurrencyExchangeRate"("status");
CREATE INDEX "CurrencyExchangeRate_effectiveDate_idx" ON "CurrencyExchangeRate"("effectiveDate");
