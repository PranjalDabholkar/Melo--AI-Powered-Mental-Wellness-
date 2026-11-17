const mongoose = require('mongoose');

const auriMessageSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    sender: {
        type: String,
        required: true,
        enum: ['Auri', 'User']
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
auriMessageSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('AuriMessage', auriMessageSchema);