const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/HP/OneDrive/Desktop/monaj/backend/.env' });
const User = require('../src/models/User');

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        console.log('Connecting to:', uri ? uri.replace(/:([^@]+)@/, ':****@') : 'undefined');
        await mongoose.connect(uri);
        console.log('Connected to DB host:', mongoose.connection.host);
        console.log('Database name:', mongoose.connection.db.databaseName);

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in database:', collections.map(c => c.name));

        const users = await User.find({}).select('+password');
        console.log(`Total users in User collection: ${users.length}`);
        for (const u of users) {
            console.log(`- ID: ${u._id}`);
            console.log(`  Name: ${u.name}`);
            console.log(`  Email: ${u.email}`);
            console.log(`  Phone: ${u.phone}`);
            console.log(`  Role: ${u.role}`);
            console.log(`  Status: ${u.accountStatus}`);
            console.log(`  Has password: ${!!u.password}`);
            console.log(`  Password Hash: ${u.password}`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
};

run();
