const fs = require('fs');
const path = require('path');

const PROMPT_PATH = path.resolve(__dirname, '../../contracts/prompts/cards/01-extract-credit-card-statement.md');
const PDF_PATH = 'I:/cajaApp-V3/docs/08-artifacts/visa-galicia-julio2026.pdf';

async function main() {
  const prompt = fs.readFileSync(PROMPT_PATH, 'utf-8');
  
  const { execSync } = require('child_process');
  const pythonExe = '.venv\\Scripts\\python.exe';
  const script = 'python\\pdf_to_raw.py';
  const raw = JSON.parse(execSync(`"${pythonExe}" "${script}" "${PDF_PATH}"`, { encoding: 'utf-8', timeout: 60000 }));
  
  const systemPrompt = prompt.replace('{{PAGE_COUNT}}', String(raw.pageCount));
  
  const body = {
    model: 'minimax-m3:cloud',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: raw.fullText }
    ],
    stream: false,
    temperature: 0,
    max_tokens: 60000
  };
  
  console.log('Sending request to Ollama with minimax-m3...');
  
  const start = Date.now();
  const res = await fetch('http://localhost:11434/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const payload = await res.json();
  const duration = Date.now() - start;
  
  console.log('HTTP status:', res.status);
  console.log('Duration ms:', duration);
  console.log('Model:', payload.model);
  console.log('Finish reason:', payload.choices?.[0]?.finish_reason);
  console.log('Usage:', JSON.stringify(payload.usage));
  
  const content = payload.choices?.[0]?.message?.content || '';
  console.log('Content length:', content.length);
  
  // Strip fences and try to parse
  let text = content.trim();
  if (text.startsWith('```json')) text = text.slice(7);
  if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  text = text.trim();
  
  try {
    const parsed = JSON.parse(text);
    console.log('JSON parse: SUCCESS');
    console.log('Rows:', parsed.rows?.length || 0);
    console.log('Sections:', parsed.sections?.length || 0);
    console.log('Groups:', parsed.groups?.length || 0);
    fs.writeFileSync('minimax-response.json', JSON.stringify(parsed, null, 2));
  } catch(e) {
    console.log('JSON parse: FAILED -', e.message);
    fs.writeFileSync('minimax-response-raw.txt', content);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
