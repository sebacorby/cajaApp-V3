const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const draftId = process.argv[2] || 'ee59f71a-4e0c-4140-b42f-4d58e03577ca';
  
  const draft = await prisma.cardStatementDraft.findUnique({
    where: { id: draftId },
    include: { document: true }
  });
  
  if (!draft) {
    console.log('Draft not found');
    process.exit(1);
  }
  
  const aiRun = await prisma.aiExtractionRun.findFirst({
    where: { documentId: draft.documentId },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('=== DRAFT ===');
  console.log('id:', draft.id);
  console.log('status:', draft.status);
  console.log('documentId:', draft.documentId);
  console.log('aiRunId:', draft.aiRunId);
  console.log('updatedAt:', draft.updatedAt);
  
  try {
    const progress = JSON.parse(draft.previewJson || '{}');
    console.log('progress:', JSON.stringify(progress, null, 2));
  } catch(e) {
    console.log('previewJson (raw):', draft.previewJson?.slice(0, 200));
  }
  
  if (aiRun) {
    console.log('\n=== AI RUN ===');
    console.log('id:', aiRun.id);
    console.log('status:', aiRun.status);
    console.log('modelProvider:', aiRun.modelProvider);
    console.log('modelName:', aiRun.modelName);
    console.log('modelBaseUrl:', aiRun.modelBaseUrl);
    console.log('completedAt:', aiRun.completedAt);
    console.log('validationErrors:', aiRun.validationErrors?.slice(0, 200));
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
