const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        // Check if admin exists
        const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        
        if (adminExists) {
            console.log('✅ Admin already exists');
            process.exit(0);
        }

        // Create admin
        const admin = new Admin({
            username: 'admin',
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            fullName: 'Super Admin',
            role: 'super_admin',
            permissions: ['view_dashboard', 'view_users', 'manage_games', 'manage_admins']
        });

        await admin.save();
        console.log('✅ Admin created successfully!');
        console.log(`📧 Email: ${process.env.ADMIN_EMAIL}`);
        console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedAdmin();
