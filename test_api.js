const axios = require('axios');

async function testApi() {
    try {
        const res = await axios.get('http://localhost:5000/api/posts');
        console.log('API Response:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('API Error:', err.message);
    }
}

testApi();
