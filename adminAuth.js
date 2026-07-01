const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Admin authentication required' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select('-password');
        
        if (!admin || !admin.isActive) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid admin' 
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Invalid admin token' 
        });
    }
};