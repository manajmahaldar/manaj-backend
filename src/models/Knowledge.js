const mongoose = require('mongoose');

const knowledgeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    youtubeLink: { type: String },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Knowledge', knowledgeSchema);
