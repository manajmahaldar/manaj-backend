const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
    const { name, phone, email, password, district, role } = req.body;
    try {
        let user = await User.findOne({ phone });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ name, phone, email, password, district, role });
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
    const { phone, email, password } = req.body;
    try {
        let user;
        if (email) {
            user = await User.findOne({ email });
        } else if (phone) {
            user = await User.findOne({ phone });
        }

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

exports.googleLogin = async (req, res) => {
    const { token, role, district, isRegistration } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        let user = await User.findOne({ 
            $or: [{ googleId }, { email }]
        });

        if (isRegistration) {
            if (user) {
                return res.status(400).json({ msg: 'Account already exists. Please log in.' });
            }
            user = new User({
                googleId,
                email,
                name,
                profilePicture: picture,
                role: role || 'farmer',
                district: district || '',
                accountStatus: 'active' 
            });
            await user.save();
        } else {
            if (!user) {
                return res.status(400).json({ msg: 'Account not found. Please register first.' });
            }
            if (!user.googleId) {
                user.googleId = googleId;
                if (!user.profilePicture) user.profilePicture = picture;
                await user.save();
            }
        }

        if (user.accountStatus === 'suspended') {
            return res.status(403).json({ msg: 'Account suspended. Contact admin.' });
        }

        const jwtToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '30d' }
        );

        res.json({
            token: jwtToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                district: user.district,
                profilePicture: user.profilePicture
            }
        });
    } catch (err) {
        console.error('Google login error:', err);
        res.status(500).json({ msg: 'Google login failed' });
    }
};
