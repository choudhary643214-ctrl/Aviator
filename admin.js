const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

router.post('/login', adminController.login);
router.post('/logout', adminAuth, adminController.logout);
router.get('/dashboard/stats', adminAuth, adminController.getStats);
router.get('/users', adminAuth, adminController.getUsers);
router.get('/users/:id', adminAuth, adminController.getUserDetails);
router.put('/users/:id', adminAuth, adminController.updateUser);
router.post('/users/:id/ban', adminAuth, adminController.banUser);
router.post('/users/:id/unban', adminAuth, adminController.unbanUser);
router.post('/users/:id/add-balance', adminAuth, adminController.addBalance);
router.get('/games', adminAuth, adminController.getGames);
router.get('/games/stats', adminAuth, adminController.getGameStats);

module.exports = router;