const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/authRoutes.js'));
app.use('/api/listings', require('./routes/listingRoutes.js'));
app.use('/api/posts', require('./routes/buyingPostRoutes.js'));
app.use('/api/admin', require('./routes/adminRoutes.js'));
app.use('/api/knowledge', require('./routes/knowledgeRoutes.js'));
app.use('/api/orders', require('./routes/orderRoutes.js'));
app.use('/api/users', require('./routes/userRoutes.js'));

// Basic Route
app.get('/', (req, res) => {
    res.send('Fish Marketplace API is running...');
});

module.exports = app;
