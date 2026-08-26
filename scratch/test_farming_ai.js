require('dotenv').config();
const mongoose = require('mongoose');
const { processFarmingAI } = require('../src/services/farmingAIService');

async function run() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");
    
    console.log("=== Testing processFarmingAI Offline Fallback ===");
    
    const res1 = await processFarmingAI({
        message: "My fish are not eating feed.",
        language: "en"
    });
    console.log("\nQuery 1: My fish are not eating feed.");
    console.log("Answer 1:", res1.answer);
    
    const res2 = await processFarmingAI({
        message: "My pond water has become green.",
        language: "en"
    });
    console.log("\nQuery 2: My pond water has become green.");
    console.log("Answer 2:", res2.answer);
    
    const res3 = await processFarmingAI({
        message: "How can I control ammonia?",
        language: "en"
    });
    console.log("\nQuery 3: How can I control ammonia?");
    console.log("Answer 3:", res3.answer);
    
    await mongoose.connection.close();
}

run().catch(console.error);
