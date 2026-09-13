const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const runs = await prisma.aiExtractionRun.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      documentId: true,
      modelName: true,
      draft: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
  console.log(JSON.stringify(runs, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
