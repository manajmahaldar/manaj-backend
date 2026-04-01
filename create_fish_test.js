const axios = require('axios');

async function createFishListing() {
    // We'll use the Farmer test user (01700000001) or Seller (01700000002)
    // Actually, I'll just use the token from a fresh login
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            phone: '01700000001', // Farmer (assuming it exists based on pattern)
            password: 'password123'
        });
        const token = loginRes.data.token;

        const listingData = {
            productName: 'Rui Fish (Big)',
            category: 'Fish',
            price: '350',
            district: 'কলকাতা',
            description: 'Fresh water Rui fish, directly from farm. Average weight 2-3kg.',
            phoneNumber: '01700000001',
            quantity: '50',
            unit: 'kg'
        };

        const res = await axios.post('http://localhost:5000/api/listings', listingData, {
            headers: { 'x-auth-token': token }
        });
        console.log('Fish listing created successfully:', res.data);
    } catch (err) {
        console.error('Failed to create fish listing:', err.response?.data || err.message);
    }
}

createFishListing();
