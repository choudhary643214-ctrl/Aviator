const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.get('/balance', auth, userController.getBalance);
router.post('/change-password', auth, userController.changePassword);

module.exports = router;