const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const runs = await prisma.aiExtractionRun.findMany({
    where: { status: 'started' },
    select: { id: true, modelName: true, createdAt: true }
  });
  console.log('Started runs:', JSON.stringify(runs, null, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); });
