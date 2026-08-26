require('dotenv').config();
const mongoose = require('mongoose');
const { processFarmingAI } = require('../src/services/farmingAIService');

async function testAll() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    const cases = [
        { id: "TEST 1", q: "My fish are not eating." },
        { id: "TEST 2", q: "Why is my pond water green?" },
        { id: "TEST 3", q: "How can I reduce ammonia?" },
        { id: "TEST 4", q: "What is the best feed for Rohu?" },
        { id: "TEST 5", q: "My fish are gasping near the surface." },
        { id: "TEST 6", q: "What medicine should I use?" }
    ];

    console.log("\n=== RUNNING TESTS 1 to 6 (Single turns) ===");
    for (const tc of cases) {
        const res = await processFarmingAI({
            message: tc.q,
            conversationHistory: [],
            language: "en"
        });
        console.log(`\n[${tc.id}] Query: "${tc.q}"`);
        console.log("AnswerSnippet:", res.answer.split('\n').slice(0, 5).join('\n'));
    }

    console.log("\n=== RUNNING TEST 7 (Follow-up conversation) ===");
    const history = [];
    
    // Turn 1
    const q7_1 = "My pond is 1 acre.";
    const res7_1 = await processFarmingAI({
        message: q7_1,
        conversationHistory: history,
        language: "en"
    });
    console.log(`\nTurn 1 Query: "${q7_1}"`);
    console.log("Answer 1:", res7_1.answer.split('\n')[0]);
    history.push({ role: 'user', text: q7_1 });
    history.push({ role: 'assistant', text: res7_1.answer });

    // Turn 2
    const q7_2 = "I am farming Rohu and Catla.";
    const res7_2 = await processFarmingAI({
        message: q7_2,
        conversationHistory: history,
        language: "en"
    });
    console.log(`\nTurn 2 Query: "${q7_2}"`);
    console.log("Answer 2:", res7_2.answer.split('\n')[0]);
    history.push({ role: 'user', text: q7_2 });
    history.push({ role: 'assistant', text: res7_2.answer });

    // Turn 3
    const q7_3 = "How much feed should I give?";
    const res7_3 = await processFarmingAI({
        message: q7_3,
        conversationHistory: history,
        language: "en"
    });
    console.log(`\nTurn 3 Query: "${q7_3}"`);
    console.log("Answer 3:", res7_3.answer);

    await mongoose.connection.close();
}

testAll().catch(console.error);
