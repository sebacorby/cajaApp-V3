const fs = require('fs');
const path = require('path');

const PROMPT_PATH = path.resolve(__dirname, '../../contracts/prompts/cards/01-extract-credit-card-statement.md');
const PDF_PATH = 'I:/cajaApp-V3/docs/08-artifacts/visa-galicia-julio2026.pdf';

async function main() {
  // Read prompt
  const prompt = fs.readFileSync(PROMPT_PATH, 'utf-8');
  
  // Extract text via Python
  const { execSync } = require('child_process');
  const pythonExe = '.venv\\Scripts\\python.exe';
  const script = 'python\\pdf_to_raw.py';
  const raw = JSON.parse(execSync(`"${pythonExe}" "${script}" "${PDF_PATH}"`, { encoding: 'utf-8', timeout: 60000 }));
  
  console.log('Prompt length:', prompt.length);
  console.log('Raw length:', raw.characterCount);
  
  const systemPrompt = prompt.replace('{{PAGE_COUNT}}', String(raw.pageCount));
  
  const body = {
    model: 'kimi-k2.7-code:cloud',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: raw.fullText }
    ],
    stream: false,
    temperature: 0,
    max_tokens: 32768
  };
  
  console.log('Request body bytes:', JSON.stringify(body).length);
  console.log('Sending request to Ollama...');
  
  const start = Date.now();
  const res = await fetch('http://localhost:11434/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  console.log('HTTP status:', res.status);
  const payload = await res.json();
  console.log('Duration ms:', Date.now() - start);
  console.log('Model:', payload.model);
  console.log('Finish reason:', payload.choices?.[0]?.finish_reason);
  console.log('Content length:', payload.choices?.[0]?.message?.content?.length || 0);
  console.log('Content first 200 chars:', (payload.choices?.[0]?.message?.content || '').slice(0, 200));
  console.log('Usage:', JSON.stringify(payload.usage));
  
  if (payload.error) {
    console.log('ERROR:', JSON.stringify(payload.error));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
