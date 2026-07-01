const Game = require('../models/Game');
const User = require('../models/User');

// ===== GAME STATE =====
let gameState = {
    isRunning: false,
    multiplier: 1.0,
    crashPoint: 0,
    gameSession: null,
    startTime: null,
    activeBets: [],
    gameInterval: null
};

// ===== GENERATE CRASH POINT =====
const generateCrashPoint = () => {
    const r = Math.random();
    const crash = Math.floor((1 / (1 - r)) * 100) / 10;
    return Math.min(Math.max(crash, 1.5), 100);
};

// ===== START GAME =====
const startGame = async () => {
    if (gameState.isRunning) return;

    gameState.isRunning = true;
    gameState.multiplier = 1.0;
    gameState.crashPoint = generateCrashPoint();
    gameState.gameSession = 'GAME-' + Date.now().toString(36).toUpperCase();
    gameState.startTime = new Date();
    gameState.activeBets = [];

    console.log(`🚀 Game Started: ${gameState.gameSession}`);
    console.log(`💥 Crash at: ${gameState.crashPoint.toFixed(2)}x`);

    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
    }

    gameState.gameInterval = setInterval(() => {
        if (!gameState.isRunning) {
            clearInterval(gameState.gameInterval);
            return;
        }

        gameState.multiplier += 0.01;

        if (gameState.multiplier >= gameState.crashPoint) {
            clearInterval(gameState.gameInterval);
            crashGame();
        }
    }, 100);
};

// ===== CRASH GAME =====
const crashGame = async () => {
    gameState.isRunning = false;
    console.log(`💥 Game Crashed at ${gameState.multiplier.toFixed(2)}x`);

    // Process all pending bets
    for (const bet of gameState.activeBets) {
        if (bet.status === 'pending') {
            bet.result = 'loss';
            bet.status = 'completed';
            
            await Game.create({
                userId: bet.userId,
                betAmount: bet.amount,
                multiplier: gameState.multiplier,
                crashPoint: gameState.crashPoint,
                result: 'loss',
                status: 'completed',
                gameSession: gameState.gameSession,
                winAmount: 0,
                profit: -bet.amount
            });
        }
    }

    // Update user balances for losses
    for (const bet of gameState.activeBets) {
        if (bet.result === 'loss') {
            await User.findByIdAndUpdate(bet.userId, {
                $inc: { balance: -bet.amount }
            });
        }
    }

    gameState.activeBets = [];

    // Start new game after 5 seconds
    setTimeout(startGame, 5000);
};

// ===== GET GAME STATUS =====
exports.getGameStatus = async (req, res) => {
    try {
        res.json({
            success: true,
            status: {
                isRunning: gameState.isRunning,
                multiplier: Math.round(gameState.multiplier * 100) / 100,
                crashPoint: gameState.crashPoint,
                gameSession: gameState.gameSession,
                activePlayers: gameState.activeBets.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===== PLACE BET =====
exports.placeBet = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!gameState.isRunning) {
            return res.status(400).json({
                success: false,
                message: 'Game is not running'
            });
        }

        if (amount < 10) {
            return res.status(400).json({
                success: false,
                message: 'Minimum bet is ₹10'
            });
        }

        if (amount > 100000) {
            return res.status(400).json({
                success: false,
                message: 'Maximum bet is ₹100,000'
            });
        }

        const user = await User.findById(userId);
        if (user.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        // Check if user already has a bet
        const existingBet = gameState.activeBets.find(
            b => b.userId.toString() === userId && b.status === 'pending'
        );
        if (existingBet) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active bet'
            });
        }

        const bet = {
            userId: userId,
            amount: amount,
            multiplier: gameState.multiplier,
            status: 'pending',
            result: 'pending',
            placedAt: new Date()
        };

        gameState.activeBets.push(bet);

        await User.findByIdAndUpdate(userId, {
            $inc: { balance: -amount }
        });

        res.json({
            success: true,
            message: 'Bet placed successfully',
            bet: {
                amount: amount,
                currentMultiplier: Math.round(gameState.multiplier * 100) / 100
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===== CASH OUT =====
exports.cashOut = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!gameState.isRunning) {
            return res.status(400).json({
                success: false,
                message: 'Game is not running'
            });
        }

        const betIndex = gameState.activeBets.findIndex(
            b => b.userId.toString() === userId && b.status === 'pending'
        );

        if (betIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'No active bet found'
            });
        }

        const bet = gameState.activeBets[betIndex];
        const currentMultiplier = Math.round(gameState.multiplier * 100) / 100;
        const winAmount = Math.round(bet.amount * currentMultiplier);

        bet.status = 'cashed_out';
        bet.result = 'win';

        await Game.create({
            userId: userId,
            betAmount: bet.amount,
            multiplier: currentMultiplier,
            crashPoint: gameState.crashPoint,
            result: 'win',
            status: 'completed',
            gameSession: gameState.gameSession,
            winAmount: winAmount,
            profit: winAmount - bet.amount,
            cashedOutAt: currentMultiplier
        });

        await User.findByIdAndUpdate(userId, {
            $inc: { balance: winAmount }
        });

        gameState.activeBets.splice(betIndex, 1);

        res.json({
            success: true,
            message: 'Cash out successful! 🎉',
            result: {
                multiplier: currentMultiplier,
                winAmount: winAmount,
                profit: winAmount - bet.amount
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===== GET GAME HISTORY =====
exports.getGameHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, page = 1 } = req.query;

        const games = await Game.find({ userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Game.countDocuments({ userId });

        res.json({
            success: true,
            history: games,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===== LEADERBOARD =====
exports.getLeaderboard = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const leaderboard = await Game.aggregate([
            { $match: { result: 'win' } },
            { $group: {
                _id: '$userId',
                totalWins: { $sum: 1 },
                totalAmount: { $sum: '$winAmount' },
                totalProfit: { $sum: '$profit' }
            }},
            { $sort: { totalAmount: -1 } },
            { $limit: parseInt(limit) },
            { $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }},
            { $project: {
                username: { $arrayElemAt: ['$user.username', 0] },
                fullName: { $arrayElemAt: ['$user.fullName', 0] },
                totalWins: 1,
                totalAmount: 1,
                totalProfit: 1
            }}
        ]);

        res.json({
            success: true,
            leaderboard
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===== AUTO-START GAME =====
setTimeout(startGame, 2000);
