const mongoose = require('mongoose');

const ventMessageSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        expires: 180 // Auto-delete vent messages after 3 minutes
    },
    anonymousId: {
        type: String,
        required: true
    },
    clientId: {
        type: String,
        default: ''
    }
});

// Index for efficient queries
ventMessageSchema.index({ timestamp: -1 });

module.exports = mongoose.model('VentMessage', ventMessageSchema);