const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        if (!user.isActive) {
            return res.status(403).json({ 
                success: false, 
                message: 'Account is deactivated' 
            });
        }

        if (user.isLocked()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Account is locked. Please try again later' 
            });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired' 
            });
        }
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};
