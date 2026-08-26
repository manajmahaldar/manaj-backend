/**
 * debug_full.js — End-to-end test of the entire processFarmingAI service
 * Run: node debug_full.js
 * This mimics exactly what the controller does, skipping only auth and HTTP layers.
 */
require('dotenv/config');

// We need mongoose connected to test DB operations
const mongoose = require('mongoose');

async function main() {
    console.log('--- Connecting to MongoDB ---');
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected\n');
    } catch (e) {
        console.error('❌ MongoDB connection failed:', e.message);
        process.exit(1);
    }

    // Now require the service (models need mongoose connected first)
    const { processFarmingAI } = require('./src/services/farmingAIService');

    console.log('--- Calling processFarmingAI ---');
    try {
        const result = await processFarmingAI({
            message: 'Why are my fish not eating?',
            imageUrls: [],
            farmContext: { fishSpecies: 'Rohu', pondSize: '0.5 acre' },
            conversationHistory: [],
            userRole: 'Farmer',
            language: 'en'
        });

        console.log('✅ processFarmingAI SUCCESS');
        console.log('  answer (first 200 chars):', result.answer?.slice(0, 200));
        console.log('  confidence:', result.confidence);
        console.log('  possibleCauses count:', result.possibleCauses?.length);
    } catch (err) {
        console.error('❌ processFarmingAI FAILED:', err.message);
        console.error('  Stack:', err.stack?.split('\n').slice(0, 6).join('\n'));
    }

    // Test the FarmingAIConversation save operation
    console.log('\n--- Testing FarmingAIConversation save ---');
    try {
        const FarmingAIConversation = require('./src/models/FarmingAIConversation');
        
        // Use a fake userId (ObjectId shaped)
        const fakeUserId = new mongoose.Types.ObjectId();
        const conv = new FarmingAIConversation({
            userId: fakeUserId,
            title: 'Debug Test',
            farmContext: { fishSpecies: 'Rohu' },
            messages: []
        });

        // Push a user message
        conv.messages.push({ role: 'user', text: 'Why are my fish not eating?', imageUrls: [], hasAudio: false });

        // Push an assistant message with the same fields the controller uses
        conv.messages.push({
            role: 'assistant',
            text: 'Sample answer here',
            recommendations: [],
            visualObservations: [],
            possibleCauses: ['Low oxygen', 'Disease'],
            confidence: 'high',
            safeNextSteps: ['Aerate the pond', 'Check water quality']
        });

        await conv.save();
        console.log('✅ FarmingAIConversation save SUCCESS, id:', conv._id);

        // Clean up test doc
        await FarmingAIConversation.deleteOne({ _id: conv._id });
        console.log('✅ Test document cleaned up\n');
    } catch (err) {
        console.error('❌ FarmingAIConversation save FAILED:', err.message);
        console.error('  Detail:', JSON.stringify(err.errors || err, null, 2));
    }

    // Test FarmingAIAnalytics save
    console.log('--- Testing FarmingAIAnalytics save ---');
    try {
        const FarmingAIAnalytics = require('./src/models/FarmingAIAnalytics');
        const fakeUserId = new mongoose.Types.ObjectId();

        const doc = await FarmingAIAnalytics.create({
            userId: fakeUserId,
            userRole: 'Farmer',
            queryText: 'debug test',
            category: 'general',
            hasImages: false,
            hasVoice: false,
            confidenceScore: 'high',
            recommendationsCount: 0
        });
        console.log('✅ FarmingAIAnalytics save SUCCESS, id:', doc._id);

        // Clean up
        await FarmingAIAnalytics.deleteOne({ _id: doc._id });
        console.log('✅ Analytics test document cleaned up\n');
    } catch (err) {
        console.error('❌ FarmingAIAnalytics save FAILED:', err.message);
        console.error('  Detail:', JSON.stringify(err.errors || err, null, 2));
    }

    await mongoose.disconnect();
    console.log('--- Done ---');
}

main().catch(console.error);
