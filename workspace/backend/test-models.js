async function main() {
  const prompt = 'Return a short JSON: {"test": true}. One line only.';
  
  for (const model of ['kimi-k2.6:cloud', 'minimax-m3:cloud', 'kimi-k2.7-code:cloud']) {
    const start = Date.now();
    try {
      const res = await fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{role: 'user', content: prompt}],
          stream: false,
          temperature: 0,
          max_tokens: 100
        })
      });
      const payload = await res.json();
      console.log(model, '- status:', res.status, '- duration:', Date.now() - start, 'ms');
      console.log('  content:', JSON.stringify(payload.choices?.[0]?.message?.content)?.slice(0, 80));
      console.log('  finish_reason:', payload.choices?.[0]?.finish_reason);
    } catch(e) {
      console.log(model, '- ERROR:', e.message);
    }
  }
}

main().catch(e => console.error(e));
