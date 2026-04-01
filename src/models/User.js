const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    googleId: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: function() { return !this.googleId; } },
    district: { type: String, required: function() { return !this.googleId; } },
    role: { 
        type: String, 
        enum: ['farmer', 'seller', 'trader', 'hatchery', 'admin'], 
        default: 'farmer'
    },
    verifiedStatus: { type: Boolean, default: false },
    accountStatus: { 
        type: String, 
        enum: ['active', 'suspended', 'pending'], 
        default: 'pending' 
    },
    profilePicture: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function() {
    if (!this.password || !this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
