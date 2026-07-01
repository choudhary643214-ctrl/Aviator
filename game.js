const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');

router.get('/status', gameController.getGameStatus);
router.post('/bet', auth, gameController.placeBet);
router.post('/cashout', auth, gameController.cashOut);
router.get('/history', auth, gameController.getGameHistory);
router.get('/leaderboard', gameController.getLeaderboard);

module.exports = router;