const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    district: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['farmer', 'seller', 'trader', 'admin'], 
        required: true 
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
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
