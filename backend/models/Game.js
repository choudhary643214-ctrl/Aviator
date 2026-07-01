const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gameType: {
        type: String,
        enum: ['aviator'],
        default: 'aviator'
    },
    betAmount: {
        type: Number,
        required: true,
        min: 10
    },
    multiplier: { type: Number, default: 0 },
    winAmount: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    crashPoint: { type: Number, default: 0 },
    result: {
        type: String,
        enum: ['win', 'loss', 'pending', 'cashed_out'],
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    gameSession: { type: String, required: true },
    cashedOutAt: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

GameSchema.index({ userId: 1, createdAt: -1 });
GameSchema.index({ gameSession: 1 });
GameSchema.index({ result: 1 });

module.exports = mongoose.model('Game', GameSchema);
