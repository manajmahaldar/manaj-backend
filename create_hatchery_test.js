const axios = require('axios');

async function createHatcheryUser() {
    const userData = {
        name: 'Hatchery Test',
        phone: '01700000004',
        password: 'password123',
        district: 'Kolkata',
        role: 'hatchery'
    };

    try {
        const res = await axios.post('http://localhost:5000/api/auth/register', userData);
        console.log('Hatchery user created successfully:', res.data.user);
    } catch (err) {
        if (err.response?.data?.msg === 'User already exists') {
            console.log('Hatchery user already exists.');
        } else {
            console.error('Failed to create hatchery user:', err.response?.data || err.message);
        }
    }
}

createHatcheryUser();
