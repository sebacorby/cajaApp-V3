const { createCanvas, ImageData } = require('@napi-rs/canvas');
global.ImageData = ImageData;

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const fs = require('fs');

  const buf = fs.readFileSync('I:/cajaApp-V3/docs/08-artifacts/visa-galicia-julio2026.pdf');
  const data = new Uint8Array(buf);
  const pdf = await pdfjs.getDocument({data}).promise;
  console.log('Pages:', pdf.numPages);

  const maxWidth = 512;
  const jpegQuality = 0.5;

  const pageWidths = [];
  const pageHeights = [];
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = unscaledViewport.width > maxWidth ? maxWidth / unscaledViewport.width : 0.5;
    const viewport = page.getViewport({ scale });
    pageWidths.push(viewport.width);
    pageHeights.push(viewport.height);

    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas);
  }

  const totalHeight = pageHeights.reduce((sum, h) => sum + h, 0);
  const canvasWidth = Math.max(...pageWidths);

  const composite = createCanvas(canvasWidth, totalHeight);
  const ctx = composite.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, composite.width, composite.height);

  let yOffset = 0;
  for (const pageCanvas of pages) {
    ctx.drawImage(pageCanvas, 0, yOffset);
    yOffset += pageCanvas.height;
  }

  const imageBase64 = composite.toDataURL('image/jpeg', jpegQuality).split(',')[1];
  fs.writeFileSync('I:/cajaApp-V3/workspace/backend/test-image.txt', imageBase64);
  console.log('Image saved to test-image.txt, size:', imageBase64.length, 'chars');

  const prompt = fs.readFileSync('I:/cajaApp-V3/contracts/prompts/cards/01-extract-credit-card-statement.md', 'utf-8');

  const requestBody = {
    model: 'kimi-k2.7-code:cloud',
    messages: [{ role: 'user', content: prompt, images: [imageBase64] }],
    stream: false,
    format: 'json',
  };

  fs.writeFileSync('I:/cajaApp-V3/workspace/backend/ollama-request.json', JSON.stringify(requestBody, null, 2));
  console.log('Request saved to ollama-request.json');

  console.log('\n--- CURL COMMAND ---');
  console.log('curl -X POST http://localhost:11434/api/chat -H "Content-Type: application/json" -d @ollama-request.json');
}

main().catch(e => console.error(e.message));
