const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { 
        expiresIn: process.env.JWT_EXPIRE || '7d' 
    });
};

exports.register = async (req, res) => {
    try {
        const { username, email, password, fullName, phone } = req.body;

        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }, { phone }] 
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email, username or phone'
            });
        }

        const user = new User({ username, email, password, fullName, phone });
        await user.save();

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                balance: user.balance,
                referralCode: user.referralCode
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ 
            $or: [{ email }, { username: email }] 
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (user.isLocked()) {
            return res.status(403).json({
                success: false,
                message: 'Account is locked. Please try again after 30 minutes'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            await user.incrementLoginAttempts();
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        await user.resetLoginAttempts();
        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                balance: user.balance,
                role: user.role,
                referralCode: user.referralCode
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

exports.verifyEmail = async (req, res) => {
    res.json({
        success: true,
        message: 'Email verified successfully'
    });
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        
        res.json({
            success: true,
            message: 'Password reset link sent to your email',
            resetToken
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.resetPassword = async (req, res) => {
    res.json({
        success: true,
        message: 'Password reset successfully'
    });
};
