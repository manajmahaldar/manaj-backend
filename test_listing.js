require('dotenv').config();
const axios = require('axios');

async function testListing() {
    const token = 'PASTE_TOKEN_HERE'; // Or get it from login
    
    // Login to get token first
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            phone: '01700000002', // Seller
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful, token retrieved.');

        const formData = {
            productName: 'Test Fish',
            category: 'Fish',
            price: '100',
            district: 'কলকাতা',
            description: 'Test description',
            phoneNumber: '9800000000',
            quantity: '10',
            unit: 'kg'
        };

        const res = await axios.post('http://localhost:5000/api/listings', formData, {
            headers: { 'x-auth-token': token }
        });
        console.log('Listing created:', res.data);
    } catch (err) {
        console.error('Test failed:', err.response?.data || err.message);
    }
}

testListing();
