/**
 * debug_groq.js — One-shot Groq connectivity test
 * Run: node debug_groq.js
 */
require('dotenv/config');
const Groq = require('groq-sdk');

const apiKey = process.env.GROQ_API_KEY;
const model  = process.env.GROQ_FARMING_MODEL || 'openai/gpt-oss-120b';

console.log('API Key loaded:', apiKey ? `${apiKey.slice(0,10)}...` : 'MISSING');
console.log('Model:', model);

if (!apiKey) { console.error('No API key!'); process.exit(1); }

const groq = new Groq({ apiKey });

(async () => {
    try {
        const res = await groq.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: 'You are a helpful aquaculture expert. Always respond with valid JSON only.' },
                { role: 'user',   content: 'Why do fish stop eating? Respond in JSON with keys: answer, possibleCauses (array), immediateActions (array).' }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 1024
        });

        const content = res.choices[0]?.message?.content;
        console.log('\n✅ SUCCESS. Raw response:\n', content?.slice(0, 400), '...');
        const parsed = JSON.parse(content);
        console.log('✅ Parsed keys:', Object.keys(parsed));
    } catch (err) {
        console.error('\n❌ Groq error:');
        console.error('  status:', err?.status ?? err?.statusCode);
        console.error('  message:', err?.message);
        console.error('  response body:', JSON.stringify(err?.error ?? err?.response?.data, null, 2));
    }
})();
