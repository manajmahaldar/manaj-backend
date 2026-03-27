const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { name, phone, password, district, role } = req.body;
    try {
        let user = await User.findOne({ phone });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ name, phone, password, district, role });
        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                district: user.district
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).send('Server error');
    }
};

exports.login = async (req, res) => {
    const { phone, password } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        if (user.accountStatus === 'suspended') {
            return res.status(403).json({ msg: 'Account suspended. Contact admin.' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                district: user.district
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Server error');
    }
};
