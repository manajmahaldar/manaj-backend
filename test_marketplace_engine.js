/**
 * test_marketplace_engine.js
 * Verify that Groq extraction, description generation, and search parsing work as expected.
 */
require('dotenv/config');
const mongoose = require('mongoose');

async function run() {
    console.log('--- Connecting to MongoDB ---');
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected\n');
    } catch (e) {
        console.error('❌ DB connection failed:', e.message);
        process.exit(1);
    }

    const { processAIRequest } = require('./src/services/aiAgentEngine');

    // Test 1: Intent Search
    console.log('--- TEST 1: Natural Search ---');
    try {
        const res = await processAIRequest({
            message: 'Show me Rohu fish available near Malda',
            context: {},
            language: 'en'
        });
        console.log('✅ Result Type:', res.type);
        console.log('✅ Reply:', res.reply);
        console.log('✅ Found Listings count:', res.results?.length);
        if (res.results?.length > 0) {
            console.log('   First item:', res.results[0]);
        }
    } catch (err) {
        console.error('❌ Test 1 failed:', err.message);
    }

    // Test 2: Multi-field extraction
    console.log('\n--- TEST 2: Multi-field Extraction ---');
    try {
        const res = await processAIRequest({
            message: 'I want to sell around 500 kg Rohu fish at 140 rupees in Malda',
            context: {},
            language: 'en'
        });
        console.log('✅ Result Type:', res.type);
        console.log('✅ Extracted Data:', JSON.stringify(res.extractedData, null, 2));
    } catch (err) {
        console.error('❌ Test 2 failed:', err.message);
    }

    // Test 3: Correction
    console.log('\n--- TEST 3: Correction ---');
    try {
        const context = {
            actionType: 'selling',
            category: 'Fish',
            productName: 'Rohu',
            quantity: '500',
            unit: 'kg',
            price: '140',
            district: 'West Bengal',
            localDistrict: 'Malda',
            nextField: 'policeStation'
        };
        const res = await processAIRequest({
            message: 'Actually quantity is 700 kg, and price is 150',
            context,
            language: 'en'
        });
        console.log('✅ Result Type:', res.type);
        console.log('✅ Updated Data Quantity:', res.extractedData.quantity);
        console.log('✅ Updated Data Price:', res.extractedData.price);
    } catch (err) {
        console.error('❌ Test 3 failed:', err.message);
    }

    await mongoose.disconnect();
    console.log('\n--- Disconnected ---');
}

run();
