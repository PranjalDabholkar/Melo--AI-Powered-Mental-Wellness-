const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    mood: {
        type: String,
        required: true
    },
    moodScore: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    text: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
journalEntrySchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);