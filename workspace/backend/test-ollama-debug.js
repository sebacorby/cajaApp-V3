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
    model: 'kimi-k2.7-code:cloud',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: raw.fullText }
    ],
    stream: false,
    temperature: 0,
    max_tokens: 32768
  };
  
  console.log('Sending request to Ollama...');
  
  const start = Date.now();
  const res = await fetch('http://localhost:11434/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const payload = await res.json();
  console.log('Duration ms:', Date.now() - start);
  console.log('Full response keys:', Object.keys(payload));
  console.log('Choice keys:', Object.keys(payload.choices?.[0] || {}));
  console.log('Message keys:', Object.keys(payload.choices?.[0]?.message || {}));
  console.log('Full content:', JSON.stringify(payload.choices?.[0]?.message?.content));
  console.log('Full reasoning:', JSON.stringify(payload.choices?.[0]?.message?.reasoning)?.slice(0, 500));
  console.log('Usage:', JSON.stringify(payload.usage));
  
  fs.writeFileSync('ollama-response.json', JSON.stringify(payload, null, 2));
  console.log('Saved to ollama-response.json');
}

main().catch(e => { console.error(e); process.exit(1); });
