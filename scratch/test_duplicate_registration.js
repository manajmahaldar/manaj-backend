const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api'; // Adjust port if necessary

const testUser = {
    name: 'Duplicate Test User',
    phone: '9876543210',
    email: 'duplicate@example.com',
    password: 'Password123!',
    district: 'Test District',
    role: 'farmer'
};

const runTest = async () => {
    try {
        console.log('--- Starting Duplicate Registration Test ---');

        // 1. Register first user
        console.log('Registering first user...');
        try {
            await axios.post(`${BASE_URL}/auth/register`, testUser);
            console.log('First user registered successfully.');
        } catch (err) {
            if (err.response?.data?.msg?.includes('already exists') || err.response?.data?.msg?.includes('already in use')) {
                console.log('User already exists from previous test run. Continuing...');
            } else {
                throw err;
            }
        }

        // 2. Try duplicate email
        console.log('\nTesting duplicate email...');
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                ...testUser,
                phone: '9876543211', // different phone
                email: 'DUPLICATE@example.com' // same email (case insensitive)
            });
            console.error('FAIL: Duplicate email allowed!');
        } catch (err) {
            console.log('SUCCESS: Duplicate email blocked. Response:', err.response?.data?.msg);
        }

        // 3. Try duplicate phone
        console.log('\nTesting duplicate phone...');
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                ...testUser,
                phone: '+919876543210', // same phone (different format)
                email: 'different@example.com' // different email
            });
            console.error('FAIL: Duplicate phone allowed!');
        } catch (err) {
            console.log('SUCCESS: Duplicate phone blocked. Response:', err.response?.data?.msg);
        }

        // 4. Try duplicate phone with another format
        console.log('\nTesting duplicate phone (0 prefix)...');
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                ...testUser,
                phone: '09876543210', // same phone (0 prefix)
                email: 'another@example.com' // different email
            });
            console.error('FAIL: Duplicate phone (0 prefix) allowed!');
        } catch (err) {
            console.log('SUCCESS: Duplicate phone (0 prefix) blocked. Response:', err.response?.data?.msg);
        }

        console.log('\n--- Duplicate Registration Test Completed ---');
    } catch (err) {
        console.error('Test failed with error:', err.message);
        if (err.response) console.error('Response data:', err.response.data);
    }
};

runTest();
