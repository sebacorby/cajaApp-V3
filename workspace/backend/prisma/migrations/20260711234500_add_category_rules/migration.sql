CREATE TABLE "MovementCategoryRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "normalizedKeyword" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MovementCategoryRule_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "MovementCategory" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MovementCategoryRule_categoryId_normalizedKeyword_key"
ON "MovementCategoryRule"("categoryId", "normalizedKeyword");

CREATE INDEX "MovementCategoryRule_active_priority_idx"
ON "MovementCategoryRule"("active", "priority");

CREATE INDEX "MovementCategoryRule_normalizedKeyword_idx"
ON "MovementCategoryRule"("normalizedKeyword");
