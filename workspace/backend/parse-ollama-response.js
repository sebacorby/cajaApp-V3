const fs = require('fs');
const payload = JSON.parse(fs.readFileSync('ollama-response.json', 'utf-8'));

const content = payload.choices[0].message.content;
console.log('Content length:', content.length);

// Strip markdown fences
let text = content.trim();
if (text.startsWith('```json')) text = text.slice(7);
if (text.startsWith('```')) text = text.slice(3);
if (text.endsWith('```')) text = text.slice(0, -3);
text = text.trim();

console.log('Text after strip length:', text.length);
console.log('First 100 chars:', text.slice(0, 100));
console.log('Last 100 chars:', text.slice(-100));

try {
  const parsed = JSON.parse(text);
  console.log('JSON parse: SUCCESS');
  console.log('Rows count:', parsed.rows?.length || 0);
  console.log('Sections count:', parsed.sections?.length || 0);
  console.log('Groups count:', parsed.groups?.length || 0);
} catch(e) {
  console.log('JSON parse: FAILED');
  console.log(e.message);
  
  // Find the last valid JSON position
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastValid = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"' && !inString) { inString = true; continue; }
    if (c === '"' && inString) { inString = false; continue; }
    if (!inString) {
      if (c === '{' || c === '[') depth++;
      if (c === '}' || c === ']') depth--;
    }
    if (depth === 0 && !inString && i > 10) {
      lastValid = i;
    }
  }
  console.log('Last valid complete object at char:', lastValid);
  console.log('Context:', text.slice(Math.max(0, lastValid - 50), lastValid + 50));
}
