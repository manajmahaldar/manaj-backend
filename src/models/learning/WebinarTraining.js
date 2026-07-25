const mongoose = require('mongoose');

const webinarTrainingSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['webinar', 'training_program'], required: true },
    instructor: { type: String, required: true },
    description: { type: String, default: '' },
    scheduledDate: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    meetingUrl: { type: String, default: '' },
    recordingUrl: { type: String, default: '' },
    maxRegistrations: { type: Number, default: 100 },
    registrations: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String },
        email: { type: String },
        registeredAt: { type: Date, default: Date.now }
    }],
    status: { 
        type: String, 
        enum: ['draft', 'scheduled', 'live', 'completed', 'archived'], 
        default: 'scheduled' 
    },
    featured: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('WebinarTraining', webinarTrainingSchema);
