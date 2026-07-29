import { prisma } from "../db/prisma.js";
import { repairLegacyProjectionRowIds } from "../modules/cards/legacy-projection-rowid-repair.js";

async function main(): Promise<void> {
  const stats = await repairLegacyProjectionRowIds();
  console.log(`[legacy-projection-rowid-repair] ${JSON.stringify(stats)}`);
}

main()
  .catch((error) => {
    console.error("[legacy-projection-rowid-repair] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
