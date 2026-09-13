const fs = require('fs');
const path = require('path');

// Set up environment
process.env.NODE_ENV = 'development';
process.env.DATABASE_URL = 'file:./dev.db';
process.env.STORAGE_DIR = './storage';
process.env.AI_PROVIDER = 'openai-compatible';
process.env.AI_BASE_URL = 'http://localhost:11434/v1';
process.env.AI_CHAT_COMPLETIONS_PATH = '/chat/completions';
process.env.AI_MODEL = 'kimi-k2.7-code:cloud';
process.env.AI_TIMEOUT_MS = '420000';
process.env.AI_MAX_OUTPUT_TOKENS = '60000';
process.env.AI_TEMPERATURE = '0';
process.env.AI_TOKEN_PARAMETER = 'max_tokens';
process.env.AI_RESPONSE_FORMAT = 'none';
process.env.PYTHON_EXECUTABLE = '.venv\\Scripts\\python.exe';
process.env.PDF_RAW_EXTRACTOR_SCRIPT = 'python\\pdf_to_raw.py';
process.env.PDF_RAW_EXTRACTION_TIMEOUT_MS = '60000';
process.env.PDF_RAW_MAX_OUTPUT_BYTES = '8000000';
process.env.PDF_RAW_MAX_CHARACTERS = '250000';
process.env.CARD_STATEMENT_PROMPTS_DIR = '../../contracts/prompts/cards';
process.env.CARD_STATEMENT_SCHEMAS_DIR = '../../contracts/schemas/cards';
process.env.AI_MOCK_MODE = 'false';

async function main() {
  const { importsService } = require('./dist/modules/imports/imports.service.js');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const pdfPath = 'I:/cajaApp-V3/docs/08-artifacts/visa-galicia-julio2026.pdf';
  const fileBuffer = fs.readFileSync(pdfPath);
  
  console.log('Starting import...');
  console.log('File size:', fileBuffer.length);
  
  const startTime = Date.now();
  const { draftId, pageCount } = await importsService.startImport({
    filename: 'visa-galicia-julio2026.pdf',
    mimetype: 'application/pdf',
    file: fileBuffer
  });
  
  console.log('Draft created:', draftId);
  console.log('Page count:', pageCount);
  
  // Poll status
  let attempts = 0;
  const maxAttempts = 60; // 30 min total (30s * 60)
  
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 30000));
    attempts++;
    
    const status = await importsService.getImportStatus(draftId, startTime);
    console.log(`[${attempts}] Status: ${status.status}, Stage: ${status.progress?.stage || 'N/A'}`);
    
    if (status.status === 'preview_ready' || status.status === 'failed') {
      console.log('\n=== FINAL STATUS ===');
      console.log(JSON.stringify(status, null, 2));
      
      // Get counts from DB
      const draft = await prisma.cardStatementDraft.findUnique({
        where: { id: draftId },
        include: { 
          sections: true, 
          groups: true, 
          rows: true 
        }
      });
      
      console.log('\n=== DB COUNTS ===');
      console.log('Sections:', draft?.sections?.length || 0);
      console.log('Groups:', draft?.groups?.length || 0);
      console.log('Rows:', draft?.rows?.length || 0);
      
      await prisma.$disconnect();
      return;
    }
  }
  
  console.log('Timeout reached');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
