const mongoose = require('mongoose');
const User = require('./models/User');
const JournalEntry = require('./models/JournalEntry');
const AuriMessage = require('./models/AuriMessage');
const VentMessage = require('./models/VentMessage');

class DatabaseService {
    constructor() {
        this.isConnected = false;
        this.connectionString = '';
    }

    async connect() {
        try {
            if (this.isConnected) return;

            // Always read latest env at connect time (works for serverless + local)
            this.connectionString = process.env.MONGODB_URI || '';

            if (!this.connectionString) {
                throw new Error('MONGODB_URI is not set');
            }

            if (this.connectionString.includes('<db_password>')) {
                throw new Error('MONGODB_URI still contains <db_password>. Replace it with your real Atlas DB password.');
            }

            await mongoose.connect(this.connectionString);

            this.isConnected = true;
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('✅ Disconnected from MongoDB');
        } catch (error) {
            console.error('❌ MongoDB disconnect error:', error);
        }
    }

    // User operations
    async getUser(userId) {
        try {
            return await User.findOne({ userId });
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    async createUser(userId, userData = {}) {
        try {
            const user = new User({
                userId,
                ...userData
            });
            return await user.save();
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async updateUser(userId, updateData) {
        try {
            return await User.findOneAndUpdate(
                { userId },
                { ...updateData, updatedAt: new Date() },
                { new: true, upsert: true }
            );
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Journal operations
    async saveJournalEntry(userId, entryData) {
        try {
            const entry = new JournalEntry({
                userId,
                ...entryData
            });
            return await entry.save();
        } catch (error) {
            console.error('Error saving journal entry:', error);
            throw error;
        }
    }

    async getJournalEntries(userId, limit = 50) {
        try {
            return await JournalEntry.find({ userId })
                .sort({ date: -1 })
                .limit(limit);
        } catch (error) {
            console.error('Error getting journal entries:', error);
            return [];
        }
    }

    async deleteJournalEntry(userId, entryId) {
        try {
            return await JournalEntry.findOneAndDelete({
                _id: entryId,
                userId: userId
            });
        } catch (error) {
            console.error('Error deleting journal entry:', error);
            throw error;
        }
    }

    // Auri chat operations
    async saveAuriMessage(userId, messageData) {
        try {
            const message = new AuriMessage({
                userId,
                ...messageData
            });
            return await message.save();
        } catch (error) {
            console.error('Error saving Auri message:', error);
            throw error;
        }
    }

    async getAuriHistory(userId, limit = 100) {
        try {
            return await AuriMessage.find({ userId })
                .sort({ timestamp: -1 })
                .limit(limit)
                .sort({ timestamp: 1 }); // Return in chronological order
        } catch (error) {
            console.error('Error getting Auri history:', error);
            return [];
        }
    }

    // Vent room operations
    async saveVentMessage(messageData) {
        try {
            const message = new VentMessage(messageData);
            return await message.save();
        } catch (error) {
            console.error('Error saving vent message:', error);
            throw error;
        }
    }

    async getVentHistory(limit = 50) {
        try {
            const cutoff = new Date(Date.now() - (3 * 60 * 1000));
            const messages = await VentMessage.find({})
                .where('timestamp').gte(cutoff)
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean();
            return messages.reverse(); // Chronological order (oldest first) for display
        } catch (error) {
            console.error('Error getting vent history:', error);
            return [];
        }
    }
}

module.exports = new DatabaseService();