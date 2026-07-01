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
        
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Admin not found' 
            });
        }

        if (!admin.isActive) {
            return res.status(403).json({ 
                success: false, 
                message: 'Admin account is deactivated' 
            });
        }

        req.admin = admin;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Invalid admin token' 
        });
    }
};
