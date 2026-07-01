const Admin = require('../models/Admin');
const User = require('../models/User');
const Game = require('../models/Game');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Admin account is deactivated'
            });
        }

        const token = jwt.sign(
            { id: admin._id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        admin.lastLogin = new Date();
        await admin.save();

        res.json({
            success: true,
            message: 'Admin login successful',
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                fullName: admin.fullName,
                role: admin.role,
                permissions: admin.permissions
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.logout = async (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
};

exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const totalGames = await Game.countDocuments();
        const totalRevenue = await Game.aggregate([
            { $match: { result: 'win' } },
            { $group: { _id: null, total: { $sum: '$winAmount' } } }
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayGames = await Game.countDocuments({
            createdAt: { $gte: today }
        });

        res.json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                totalGames,
                totalRevenue: totalRevenue[0]?.total || 0,
                todayGames,
                onlineUsers: Math.floor(Math.random() * 100) + 20
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;

        const query = search ? {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } }
            ]
        } : {};

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            users,
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

exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -loginAttempts -lockUntil');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const gameStats = await Game.aggregate([
            { $match: { userId: user._id } },
            { $group: {
                _id: '$result',
                count: { $sum: 1 },
                total: { $sum: '$winAmount' }
            }}
        ]);

        res.json({
            success: true,
            user,
            gameStats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { fullName, phone, role } = req.body;
        const updates = {};

        if (fullName) updates.fullName = fullName;
        if (phone) updates.phone = phone;
        if (role) updates.role = role;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.banUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User banned successfully',
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.unbanUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User unbanned successfully',
            user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.addBalance = async (req, res) => {
    try {
        const { amount } = req.body;

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $inc: { balance: amount } },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: `₹${amount} added to user balance`,
            user: {
                id: user._id,
                username: user.username,
                balance: user.balance
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getGames = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const games = await Game.find()
            .populate('userId', 'username fullName email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Game.countDocuments();

        res.json({
            success: true,
            games,
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

exports.getGameStats = async (req, res) => {
    try {
        const totalGames = await Game.countDocuments();
        const totalWins = await Game.countDocuments({ result: 'win' });
        const totalLosses = await Game.countDocuments({ result: 'loss' });
        const totalRevenue = await Game.aggregate([
            { $match: { result: 'win' } },
            { $group: { _id: null, total: { $sum: '$winAmount' } } }
        ]);

        res.json({
            success: true,
            stats: {
                totalGames,
                totalWins,
                totalLosses,
                totalRevenue: totalRevenue[0]?.total || 0,
                winRate: totalGames > 0 ? (totalWins / totalGames * 100).toFixed(2) : 0
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
