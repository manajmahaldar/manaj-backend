const mongoose = require('mongoose');

const buyingPostSchema = new mongoose.Schema({
    traderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Category — fish | feed | medicine
    category: {
        type: String,
        enum: ['fish', 'feed', 'medicine', 'equipment'],
        default: 'fish'
    },

    // ── Common product field (product name / fish name) ──────────────────
    // "fishName" is kept as the primary field for backward compatibility.
    // For feed/medicine records this field stores the product/feed/medicine name.
    fishName: { type: String, required: true },

    // ── Fish-specific ─────────────────────────────────────────────────────
    // "size" was the original field used for fish size AND packing size.
    // Kept required:false so new category-split records don't break validation.
    size: { type: String, default: '' },            // fish size (e.g. "2-3 kg/piece")

    // ── Feed-specific ─────────────────────────────────────────────────────
    feedType: { type: String, default: '' },        // e.g. "Pre-Starter", "Starter"

    // ── Medicine-specific ─────────────────────────────────────────────────
    medicineType: { type: String, default: '' },    // e.g. "Powder", "Liquid", "Tablet"
    strength: { type: String, default: '' },        // e.g. "500 mg" (optional)

    // ── Feed & Medicine shared ────────────────────────────────────────────
    packingSize: { type: String, default: '' },     // e.g. "50 kg/bag", "1 kg pack"

    // ── Common quantity & budget ──────────────────────────────────────────
    requiredQuantity: { type: String, required: true },   // e.g. "1000 kg", "50 bags"
    buyingPrice: { type: String, required: true },        // e.g. "220", "2500"

    // ── Location ─────────────────────────────────────────────────────────
    district: { type: String, required: true },           // State (e.g. "West Bengal")
    localDistrict: { type: String, default: '' },         // District (e.g. "Malda")
    policeStation: { type: String, default: '' },         // Police Station / Block

    // ── Contact ───────────────────────────────────────────────────────────
    phoneNumber: { type: String, required: true },

    // ── Extra ─────────────────────────────────────────────────────────────
    additionalRequirement: { type: String, default: '' }, // Free-text optional field

    // ── Media ─────────────────────────────────────────────────────────────
    photos: [{ type: String }],

    // ── Status & Moderation ───────────────────────────────────────────────
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },

    // ── Fraud Detection ───────────────────────────────────────────────────
    isFlagged:   { type: Boolean, default: false },
    fraudReason: { type: String, default: '' },
    fraudScore:  { type: Number, default: 0 },
    rejectionReason: { type: String, default: '' },

    createdAt: { type: Date, default: Date.now }
});

// Indexes for scalability
buyingPostSchema.index({ status: 1, district: 1, category: 1, createdAt: -1 });
buyingPostSchema.index({ traderId: 1, createdAt: -1 });
buyingPostSchema.index({ createdAt: -1 });
buyingPostSchema.index({ status: 1 });
buyingPostSchema.index({ fishName: 'text', district: 'text' });

module.exports = mongoose.model('BuyingPost', buyingPostSchema);
