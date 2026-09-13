const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.cardStatementDraft.updateMany({
    where: { status: 'processing' },
    data: {
      status: 'failed',
      previewJson: JSON.stringify({
        stage: 'failed',
        error: { message: 'Cleared for testing', failedAt: new Date().toISOString() }
      })
    }
  });
  console.log('Cleared');
  await prisma.$disconnect();
}
main().catch(console.error);