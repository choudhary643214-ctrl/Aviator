const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        
        if (adminExists) {
            console.log('✅ Admin already exists');
            process.exit(0);
        }

        const admin = new Admin({
            username: 'admin',
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
            fullName: 'Super Admin',
            role: 'super_admin'
        });

        await admin.save();
        console.log('✅ Admin created!');
        console.log(`📧 Email: ${process.env.ADMIN_EMAIL}`);
        console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedAdmin();